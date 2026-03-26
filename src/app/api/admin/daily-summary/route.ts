import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSalesDayContext } from "@/lib/sales-day"
import { sendDailySummaryMessage } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

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

async function generateSummary() {
  const now = new Date()
  const salesDay = getSalesDayContext(now)

  const approvedOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: salesDay.windowStart,
        lt: salesDay.windowEnd,
      },
      status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] },
    },
    include: {
      user: { select: { name: true } },
      draw: true,
      items: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const pendingApprovalCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: salesDay.windowStart,
        lt: salesDay.windowEnd,
      },
      status: "PENDING_APPROVAL",
    },
  })

  const pendingPaymentCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: salesDay.windowStart,
        lt: salesDay.windowEnd,
      },
      status: "PENDING_PAYMENT",
    },
  })

  const groupedTickets = new Map<string, { drawType: string; drawDateLabel: string; numbers: string; count: number }>()
  for (const order of approvedOrders) {
    for (const item of order.items) {
      const numbers = `${item.mainNumbers} | ${item.specialNumber}`
      const drawDateLabel = order.draw.drawDate.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      const groupKey = `${order.draw.type}|${order.draw.id}|${numbers}`
      const existing = groupedTickets.get(groupKey)
      if (existing) {
        existing.count += 1
      } else {
        groupedTickets.set(groupKey, {
          drawType: order.draw.type,
          drawDateLabel,
          numbers,
          count: 1,
        })
      }
    }
  }

  const groupedByDraw = Array.from(groupedTickets.values()).reduce<Record<string, { drawDateLabel: string; numbers: string; count: number }[]>>(
    (acc, item) => {
      const key = `${item.drawType}|${item.drawDateLabel}`
      acc[key] ??= []
      acc[key].push({ drawDateLabel: item.drawDateLabel, numbers: item.numbers, count: item.count })
      return acc
    },
    {}
  )

  const lines: string[] = [
    `📊 *สรุปเลขที่ต้องซื้อประจำวัน*`,
    `🕖 ส่งสรุปเวลา 7:00 AM LAX`,
    `📅 รอบออเดอร์: ${salesDay.salesDateLabel} (LAX)`,
    `🕒 เวลาปัจจุบัน: ${salesDay.currentTimeLabel}`,
    `${"─".repeat(30)}`,
  ]

  if (approvedOrders.length === 0) {
    lines.push("ยังไม่มีออเดอร์ที่อนุมัติแล้วสำหรับรอบนี้")
  }

  for (const [drawKey, items] of Object.entries(groupedByDraw)) {
    const [drawType, drawDateLabel] = drawKey.split("|")
    const drawLabel = drawType === "POWERBALL" ? "🔴 Power Ball" : "🔵 Mega Ball"
    lines.push("")
    lines.push(`${drawLabel} — ${drawDateLabel}`)
    lines.push(`${"─".repeat(20)}`)

    for (const item of items.sort((a, b) => b.count - a.count || a.numbers.localeCompare(b.numbers))) {
      lines.push(`• ${item.numbers} = ${item.count} ชุด`)
    }
  }

  lines.push(``)
  lines.push(`${"─".repeat(30)}`)
  lines.push(`✅ ออเดอร์อนุมัติแล้ว: ${approvedOrders.length} ออเดอร์`)
  lines.push(`⏳ รอกดอนุมัติ: ${pendingApprovalCount} ออเดอร์`)
  lines.push(`💳 ยังไม่ส่งสลิป: ${pendingPaymentCount} ออเดอร์`)
  lines.push(`ℹ️ ออเดอร์ที่เข้าหลัง 7:00 AM LAX จะไปรวมในรอบวันถัดไป`)

  const message = lines.join("\n")

  return {
    message,
    generatedAt: now.toISOString(),
    salesDateLabel: salesDay.salesDateLabel,
    drawLabel: salesDay.drawLabel,
    approvedOrders: approvedOrders.length,
    pendingApprovalCount,
    pendingPaymentCount,
    groupedByDraw,
  }
}
