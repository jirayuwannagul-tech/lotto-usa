import { readFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUploadContentType, getUploadFilePath } from "@/lib/upload"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { itemId } = await params
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: { select: { userId: true } } },
  })

  if (!item || !item.ticketPhotoUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (session.user.role !== "ADMIN" && item.order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const assetPath = getUploadFilePath(item.ticketPhotoUrl)
    const buffer = await readFile(assetPath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": getUploadContentType(item.ticketPhotoUrl),
        "Content-Disposition": 'inline; filename="ticket"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
