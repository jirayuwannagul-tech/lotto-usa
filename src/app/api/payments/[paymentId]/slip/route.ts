import { readFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUploadContentType, getUploadFilePath } from "@/lib/upload"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { paymentId } = await params
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: { select: { userId: true } } },
  })

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (session.user.role !== "ADMIN" && payment.order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const assetPath = getUploadFilePath(payment.slipUrl)
    const buffer = await readFile(assetPath)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": getUploadContentType(payment.slipUrl),
        "Content-Disposition": 'inline; filename="slip"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
