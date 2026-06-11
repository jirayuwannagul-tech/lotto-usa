import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage, sendRealtimeMessage } from "@/lib/telegram"
import { cropTicketPlay } from "@/lib/upload"

type MatchEntry = {
  orderItemId: string
  topPercent?: number
  heightPercent?: number
}

type ConfirmBody = {
  ticketPhotoUrl: string
  ocrRawText?: string
  matches: MatchEntry[]
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

  const matches = Array.from(
    new Map(body.matches?.map((m) => [m.orderItemId, m]) ?? []).values()
  ).filter((m) => Boolean(m.orderItemId))

  if (matches.length === 0 || !body.ticketPhotoUrl) {
    return NextResponse.json({ error: "ข้อมูลยืนยันไม่ครบ" }, { status: 400 })
  }

  const orderItemIds = matches.map((m) => m.orderItemId)

  const items = await prisma.orderItem.findMany({
    where: { id: { in: orderItemIds } },
    include: {
      order: {
        include: {
          user: { select: { name: true, email: true } },
          draw: true,
        },
      },
    },
  })

  if (items.length !== orderItemIds.length) {
    return NextResponse.json({ error: "ไม่พบรายการที่ต้องการยืนยัน" }, { status: 404 })
  }

  const matchedAt = new Date()

  // Crop and save individual ticket photo per orderItem
  for (const match of matches) {
    const item = items.find((i) => i.id === match.orderItemId)
    if (!item) continue

    let photoUrl = body.ticketPhotoUrl

    if (
      typeof match.topPercent === "number" &&
      typeof match.heightPercent === "number" &&
      match.heightPercent > 0
    ) {
      try {
        photoUrl = await cropTicketPlay(body.ticketPhotoUrl, match.topPercent, match.heightPercent)
      } catch {
        // fallback to original image if crop fails
      }
    }

    await prisma.orderItem.update({
      where: { id: match.orderItemId },
      data: {
        ticketPhotoUrl: photoUrl,
        ocrRawText: body.ocrRawText ?? null,
        matchedAt,
      },
    })
  }

  const affectedOrderIds = Array.from(new Set(items.map((item) => item.orderId)))

  for (const orderId of affectedOrderIds) {
    const allItems = await prisma.orderItem.findMany({ where: { orderId } })
    const allMatched = allItems.every((orderItem) => orderItem.matchedAt !== null)

    await prisma.order.update({
      where: { id: orderId },
      data: { status: allMatched ? "MATCHED" : "TICKET_UPLOADED" },
    })

    const orderInfo = items.find((i) => i.orderId === orderId)
    if (orderInfo && allMatched) {
      const drawLabel = orderInfo.order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
      const drawDateThai = orderInfo.order.draw.drawDate.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      const uploadedItems = allItems
        .map((it, i) => `  ${i + 1}. ${it.mainNumbers} | ${it.specialNumber}`)
        .join("\n")

      const msg = `📸 *อัปรูปตั๋วเรียบร้อย*\n\n👤 ${orderInfo.order.user.name}\n🎱 ${drawLabel} — ${drawDateThai}\n\nเลขที่ซื้อ:\n${uploadedItems}\n\n✅ ลูกค้าสามารถดูรูปตั๋วในแดชบอร์ดได้แล้ว`

      await Promise.allSettled([
        sendAdminMessage(msg),
        sendRealtimeMessage(msg),
      ])
    }
  }

  return NextResponse.json({
    ok: true,
    orderIds: affectedOrderIds,
    orderItemIds,
  })
}
