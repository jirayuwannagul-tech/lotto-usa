import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ConfirmBody = {
  orderItemId?: string
  orderItemIds?: string[]
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

  const orderItemIds = Array.from(
    new Set(
      (body.orderItemIds?.length ? body.orderItemIds : body.orderItemId ? [body.orderItemId] : [])
        .filter(Boolean)
    )
  )

  if (orderItemIds.length === 0 || !body.ticketPhotoUrl) {
    return NextResponse.json({ error: "ข้อมูลยืนยันไม่ครบ" }, { status: 400 })
  }

  const items = await prisma.orderItem.findMany({
    where: { id: { in: orderItemIds } },
    include: { order: true },
  })

  if (items.length !== orderItemIds.length) {
    return NextResponse.json({ error: "ไม่พบรายการที่ต้องการยืนยัน" }, { status: 404 })
  }

  const matchedAt = new Date()

  await prisma.orderItem.updateMany({
    where: { id: { in: orderItemIds } },
    data: {
      ticketPhotoUrl: body.ticketPhotoUrl,
      ocrRawText: body.ocrRawText ?? null,
      matchedAt,
    },
  })

  const affectedOrderIds = Array.from(new Set(items.map((item) => item.orderId)))

  for (const orderId of affectedOrderIds) {
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    })

    const allMatched = allItems.every((orderItem) => orderItem.matchedAt !== null)

    await prisma.order.update({
      where: { id: orderId },
      data: { status: allMatched ? "MATCHED" : "TICKET_UPLOADED" },
    })
  }

  return NextResponse.json({
    ok: true,
    orderIds: affectedOrderIds,
    orderItemIds,
  })
}
