import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSalesDayContext } from "@/lib/sales-day"
import { sendDailySummaryMessage } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")
    const querySecret = new URL(req.url).searchParams.get("secret")
    const isCron = cronSecret && (
      authHeader === `Bearer ${cronSecret}` ||
      querySecret === cronSecret
    )

    if (!isCron) {
      const session = await getServerSession(authOptions)
      if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const summary = await generateSummary()
    if (isCron) {
      await sendDailySummaryMessage(summary.message)
    }
    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถสร้างสรุปได้"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await generateSummary()
    await sendDailySummaryMessage(summary.message)
    return NextResponse.json({ ok: true, summary: summary.message })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถส่งสรุปได้"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function formatTicketLine(mainNumbers: string, specialNumber: string) {
  const mains = mainNumbers.split(",").map((n) => n.padStart(2, "0")).join(" ")
  const special = specialNumber.padStart(2, "0")
  return `${mains} - ${special}`
}

async function generateSummary() {
  const now = new Date()
  const salesDay = getSalesDayContext(now)

  const todayLabel = now.toLocaleDateString("th-TH", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "2-digit",
  })

  // Only APPROVED orders = need to buy, no ticket photo yet
  const approvedOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: salesDay.windowStart, lt: salesDay.windowEnd },
      status: "APPROVED",
    },
    include: {
      draw: true,
      items: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const lines: string[] = [
    `📋 *สรุปออเดอร์วันนี้*`,
    `📅 ${todayLabel}`,
    ``,
  ]

  if (approvedOrders.length === 0) {
    lines.push(`วันนี้ไม่มีออเดอร์`)
    return { message: lines.join("\n"), generatedAt: now.toISOString(), totalNeedBuy: 0 }
  }

  // Group by draw type + draw id
  const drawMap = new Map<string, {
    drawType: string
    drawDateLabel: string
    tickets: { mainNumbers: string; specialNumber: string }[]
  }>()

  for (const order of approvedOrders) {
    const key = `${order.draw.type}|${order.draw.id}`
    if (!drawMap.has(key)) {
      const drawDateLabel = order.draw.drawDate.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      drawMap.set(key, { drawType: order.draw.type, drawDateLabel, tickets: [] })
    }
    const group = drawMap.get(key)!
    for (const item of order.items) {
      group.tickets.push({ mainNumbers: item.mainNumbers, specialNumber: item.specialNumber })
    }
  }

  let totalTickets = 0
  for (const group of drawMap.values()) {
    const drawLabel = group.drawType === "POWERBALL" ? "🔴 *Powerball*" : "🔵 *Mega Millions*"
    totalTickets += group.tickets.length

    lines.push(`${drawLabel}  (${group.drawDateLabel})`)
    lines.push(`ต้องซื้อ ${group.tickets.length} ใบ`)

    for (const t of group.tickets) {
      lines.push(formatTicketLine(t.mainNumbers, t.specialNumber))
    }
    lines.push(``)
  }

  lines.push(`รวม ${totalTickets} ใบ`)

  return {
    message: lines.join("\n"),
    generatedAt: now.toISOString(),
    totalNeedBuy: totalTickets,
  }
}
