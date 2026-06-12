import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Only fire within 31 minutes of resultAnnouncedAt so each draw triggers exactly once
  const windowStart = new Date(now.getTime() - 31 * 60 * 1000)

  const draws = await prisma.draw.findMany({
    where: {
      resultAnnouncedAt: { gte: windowStart, lte: now },
    },
    include: {
      orders: {
        where: { status: "APPROVED" },
        include: {
          items: true,
          user: { select: { name: true } },
        },
      },
    },
  })

  let alertsSent = 0

  for (const draw of draws) {
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
      for (const item of order.items.filter((i) => !i.ticketPhotoUrl)) {
        lines.push(`• ${order.user.name}: ${item.mainNumbers} | ${item.specialNumber}`)
      }
    }
    lines.push(``, `👉 /admin/tickets`)

    await sendAdminMessage(lines.join("\n")).catch(() => {})
    alertsSent++
  }

  return NextResponse.json({ ok: true, alertsSent })
}
