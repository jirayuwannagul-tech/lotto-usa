import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSalesDayContext } from "@/lib/sales-day"
import { sendDailySummaryMessage, formatLotteryNumbers } from "@/lib/telegram"

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

type TicketItem = { mainNumbers: string; specialNumber: string }
type DrawGroup = {
  drawType: string
  drawDateLabel: string
  needBuy: TicketItem[]   // APPROVED — ยังไม่อัปโหลดรูป
  uploaded: TicketItem[]  // TICKET_UPLOADED / MATCHED
}

async function generateSummary() {
  const now = new Date()
  const salesDay = getSalesDayContext(now)

  const approvedOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: salesDay.windowStart, lt: salesDay.windowEnd },
      status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] },
    },
    include: {
      draw: true,
      items: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const pendingApprovalCount = await prisma.order.count({
    where: {
      createdAt: { gte: salesDay.windowStart, lt: salesDay.windowEnd },
      status: "PENDING_APPROVAL",
    },
  })

  const pendingPaymentCount = await prisma.order.count({
    where: {
      createdAt: { gte: salesDay.windowStart, lt: salesDay.windowEnd },
      status: "PENDING_PAYMENT",
    },
  })

  // Group items by draw, split by ticket-upload status
  const drawMap = new Map<string, DrawGroup>()

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
      drawMap.set(key, { drawType: order.draw.type, drawDateLabel, needBuy: [], uploaded: [] })
    }
    const group = drawMap.get(key)!
    const items = order.items.map((i) => ({ mainNumbers: i.mainNumbers, specialNumber: i.specialNumber }))

    if (order.status === "APPROVED") {
      group.needBuy.push(...items)
    } else {
      group.uploaded.push(...items)
    }
  }

  // Build message
  const lines: string[] = [
    `📊 *สรุปเลขที่ต้องซื้อประจำวัน*`,
    `🕖 ส่งสรุปเวลา 7:00 AM LAX`,
    `📅 รอบออเดอร์: ${salesDay.salesDateLabel} (LAX)`,
    `🕒 เวลาปัจจุบัน: ${salesDay.currentTimeLabel}`,
    `${"━".repeat(28)}`,
  ]

  if (drawMap.size === 0) {
    lines.push(``, `ยังไม่มีออเดอร์ที่อนุมัติแล้วสำหรับรอบนี้`)
  }

  let totalNeedBuy = 0
  let totalUploaded = 0

  for (const group of drawMap.values()) {
    const drawLabel = group.drawType === "POWERBALL" ? "🔴 *Powerball*" : "🔵 *Mega Millions*"
    const totalItems = group.needBuy.length + group.uploaded.length
    totalNeedBuy += group.needBuy.length
    totalUploaded += group.uploaded.length

    lines.push(``)
    lines.push(`${drawLabel} — ${group.drawDateLabel}`)
    lines.push(`รวม ${totalItems} ใบ`)

    if (group.needBuy.length > 0) {
      lines.push(``)
      lines.push(`🛒 *ต้องซื้อ + ยังไม่อัปโหลดรูป — ${group.needBuy.length} ใบ*`)
      lines.push(formatLotteryNumbers(group.needBuy, group.drawType))
    }

    if (group.uploaded.length > 0) {
      lines.push(``)
      lines.push(`✅ อัปโหลดรูปแล้ว — ${group.uploaded.length} ใบ`)
      lines.push(formatLotteryNumbers(group.uploaded, group.drawType))
    }

    lines.push(`${"─".repeat(28)}`)
  }

  lines.push(``)
  lines.push(`🛒 ต้องซื้อทั้งหมด: *${totalNeedBuy} ใบ*`)
  lines.push(`✅ อัปโหลดรูปแล้ว: ${totalUploaded} ใบ`)
  lines.push(`⏳ รอกดอนุมัติ: ${pendingApprovalCount} ออเดอร์`)
  lines.push(`💳 ยังไม่ส่งสลิป: ${pendingPaymentCount} ออเดอร์`)
  lines.push(`ℹ️ ออเดอร์ที่เข้าหลัง 7:00 AM LAX จะไปรวมในรอบวันถัดไป`)

  const message = lines.join("\n")

  return {
    message,
    generatedAt: now.toISOString(),
    salesDateLabel: salesDay.salesDateLabel,
    approvedOrders: approvedOrders.length,
    totalNeedBuy,
    totalUploaded,
    pendingApprovalCount,
    pendingPaymentCount,
  }
}
