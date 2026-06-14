import { NextRequest, NextResponse } from "next/server"
import { toZonedTime } from "date-fns-tz"
import { prisma } from "@/lib/prisma"
import { sendDailySummaryMessage } from "@/lib/telegram"

const LA_TZ = "America/Los_Angeles"
const SALES_ROLLOVER_HOUR = 7

function getSalesDayWindow(now: Date) {
  const nowLA = toZonedTime(now, LA_TZ)
  const todayLA = new Date(nowLA)

  // Sales day starts at 7 AM LA today, ends at 7 AM LA tomorrow
  // But we report yesterday's window: 7 AM LA yesterday → 7 AM LA today
  const windowEnd = new Date(
    Date.UTC(
      nowLA.getFullYear(),
      nowLA.getMonth(),
      nowLA.getDate(),
      SALES_ROLLOVER_HOUR + 7, // offset from LA to UTC (PDT = UTC-7)
      0, 0, 0
    )
  )
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000)

  return { windowStart, windowEnd }
}

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    !cronSecret ||
    secret === cronSecret ||
    authHeader === `Bearer ${cronSecret}`

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const { windowStart, windowEnd } = getSalesDayWindow(now)

  const nowLA = toZonedTime(now, LA_TZ)
  const dateLabel = nowLA.toLocaleDateString("th-TH", {
    timeZone: LA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: windowStart, lt: windowEnd },
      status: { not: "REJECTED" },
    },
    include: {
      user: { select: { name: true } },
      draw: { select: { type: true, drawDate: true } },
      items: true,
    },
    orderBy: { createdAt: "asc" },
  })

  let message: string

  if (orders.length === 0) {
    message = `🌅 *สรุปยอดขาย — ${dateLabel}*\n\n😶 วันนี้ไม่มีคนซื้อเลย`
  } else {
    const totalTHB = orders.reduce((s, o) => s + Number(o.totalTHB), 0)
    const totalTickets = orders.reduce((s, o) => s + o.items.length, 0)

    const lines: string[] = [
      `🌅 *สรุปยอดขาย — ${dateLabel}*`,
      ``,
      `👥 ออเดอร์: *${orders.length}* | ใบ: *${totalTickets}* | ยอด: *${totalTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿*`,
      ``,
    ]

    // Group by draw
    const drawMap = new Map<string, { label: string; dateLabel: string; entries: { name: string; nums: string }[] }>()
    for (const order of orders) {
      const key = order.drawId
      if (!drawMap.has(key)) {
        const drawLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
        const drawDateLabel = order.draw.drawDate.toLocaleDateString("th-TH", {
          timeZone: LA_TZ, day: "numeric", month: "short",
        })
        drawMap.set(key, { label: drawLabel, dateLabel: drawDateLabel, entries: [] })
      }
      const group = drawMap.get(key)!
      const specialLabel = order.draw.type === "POWERBALL" ? "PB" : "MB"
      for (const item of order.items) {
        const mains = item.mainNumbers.split(",").map((n) => n.trim().padStart(2, "0")).join(" ")
        const special = item.specialNumber.trim().padStart(2, "0")
        group.entries.push({ name: order.user.name, nums: `\`${mains} │ ${specialLabel} ${special}\`` })
      }
    }

    for (const group of drawMap.values()) {
      lines.push(`${group.label} งวด ${group.dateLabel}`)
      for (const e of group.entries) {
        lines.push(`  ${e.nums}  — ${e.name}`)
      }
      lines.push(``)
    }

    message = lines.join("\n")
  }

  await sendDailySummaryMessage(message)
  return NextResponse.json({ ok: true, orders: orders.length, message })
}
