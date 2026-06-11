import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const alerts: string[] = []

  // Alert 17: cutoff approaching within 2 hours
  const approachingDraws = await prisma.draw.findMany({
    where: {
      isOpen: true,
      cutoffAt: { gte: now, lte: twoHoursLater },
    },
    include: {
      orders: {
        where: { status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] } },
        include: { items: true, user: { select: { name: true } } },
      },
    },
  })

  for (const draw of approachingDraws) {
    const drawLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const cutoffThai = draw.cutoffAt.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    })
    const drawDateThai = draw.drawDate.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    const lines = [
      `⚠️ *แจ้งเตือน: ใกล้ถึงเวลาปิดรับออเดอร์*`,
      ``,
      `🎱 ${drawLabel}`,
      `📅 งวด: ${drawDateThai}`,
      `⏰ ปิดรับออเดอร์: ${cutoffThai} น.`,
      ``,
    ]

    if (draw.orders.length > 0) {
      lines.push(`📋 *เลขที่ต้องไปซื้อ (${draw.orders.length} ออเดอร์):*`)
      for (const order of draw.orders) {
        for (const item of order.items) {
          lines.push(`• ${order.user.name}: ${item.mainNumbers} | ${item.specialNumber}`)
        }
      }
    } else {
      lines.push(`ยังไม่มีออเดอร์ที่อนุมัติแล้ว`)
    }

    alerts.push(lines.join("\n"))
  }

  // Alert 18: draw happened, orders still missing ticket photos
  const pastDraws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        lte: now,
      },
    },
    include: {
      orders: {
        where: { status: { in: ["APPROVED"] } },
        include: { items: true, user: { select: { name: true } } },
      },
    },
  })

  for (const draw of pastDraws) {
    const ordersNeedingPhoto = draw.orders.filter((o) =>
      o.items.some((item) => !item.ticketPhotoUrl)
    )
    if (ordersNeedingPhoto.length === 0) continue

    const drawLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const drawDateThai = draw.drawDate.toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    const lines = [
      `📸 *แจ้งเตือน: ยังไม่ได้อัปรูปตั๋ว*`,
      ``,
      `🎱 ${drawLabel} — ${drawDateThai}`,
      `⚠️ มี ${ordersNeedingPhoto.length} ออเดอร์ที่ยังไม่มีรูปตั๋ว`,
      ``,
      `📋 *รายการที่ต้องอัปรูป:*`,
    ]
    for (const order of ordersNeedingPhoto) {
      const missingItems = order.items.filter((item) => !item.ticketPhotoUrl)
      for (const item of missingItems) {
        lines.push(`• ${order.user.name}: ${item.mainNumbers} | ${item.specialNumber}`)
      }
    }
    lines.push(``)
    lines.push(`👉 ไปอัปรูปได้ที่ /admin/tickets`)

    alerts.push(lines.join("\n"))
  }

  for (const msg of alerts) {
    await sendAdminMessage(msg).catch(() => {})
  }

  return NextResponse.json({ ok: true, alertsSent: alerts.length })
}
