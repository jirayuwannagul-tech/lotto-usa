import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ConfirmBody = {
  orderItemId?: string
  ticketPhotoUrl?: string
  ocrRawText?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: ConfirmBody
  try {
    body = (await req.json()) as ConfirmBody
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  }

  if (!body.orderItemId || !body.ticketPhotoUrl) {
    return NextResponse.json({ error: "ข้อมูลยืนยันไม่ครบ" }, { status: 400 })
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: body.orderItemId },
    include: {
      order: true,
    },
  })

  if (!item) {
    return NextResponse.json({ error: "ไม่พบรายการที่ต้องการยืนยัน" }, { status: 404 })
  }

  await prisma.orderItem.update({
    where: { id: item.id },
    data: {
      ticketPhotoUrl: body.ticketPhotoUrl,
      ocrRawText: body.ocrRawText ?? null,
      matchedAt: new Date(),
    },
  })

  const allItems = await prisma.orderItem.findMany({
    where: { orderId: item.orderId },
  })

  const allMatched = allItems.every((orderItem) => orderItem.matchedAt !== null || orderItem.id === item.id)

  await prisma.order.update({
    where: { id: item.orderId },
    data: { status: allMatched ? "MATCHED" : "TICKET_UPLOADED" },
  })

  return NextResponse.json({
    ok: true,
    orderId: item.orderId,
    orderItemId: item.id,
    status: allMatched ? "MATCHED" : "TICKET_UPLOADED",
  })
}
