import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendLineNotify } from "@/lib/line-notify"

// Called by Vercel Cron at 10:00 AM LA time (17:00 UTC standard / 18:00 UTC daylight)
// Can also be triggered manually by admin via POST
export async function GET(req: NextRequest) {
  // Allow Vercel cron with CRON_SECRET
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
  return NextResponse.json(summary)
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = await generateSummary()
  await sendLineNotify(summary.message)
  return NextResponse.json({ ok: true, summary: summary.message })
}

async function generateSummary() {
  const now = new Date()

  // Get all open draws with their approved+ orders
  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    include: {
      orders: {
        where: {
          status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED", "PENDING_APPROVAL"] },
        },
        include: {
          user: { select: { name: true } },
          items: true,
        },
      },
    },
    orderBy: { drawDate: "asc" },
  })

  // Count pending payments (not yet approved)
  const pendingApprovalCount = await prisma.order.count({
    where: { status: "PENDING_APPROVAL" },
  })

  const pendingPaymentCount = await prisma.order.count({
    where: { status: "PENDING_PAYMENT" },
  })

  const laBangkokDateStr = now.toLocaleString("th-TH", {
    timeZone: "America/Los_Angeles",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const lines: string[] = [
    `📊 สรุปยอดหวย LottoUSA`,
    `🕙 ${laBangkokDateStr} (LA)`,
    `${"─".repeat(30)}`,
  ]

  if (draws.length === 0) {
    lines.push("ไม่มีงวดที่เปิดอยู่")
  }

  for (const draw of draws) {
    const isPowerball = draw.type === "POWERBALL"
    const drawLabel = isPowerball ? "🔴 POWERBALL" : "🔵 MEGA MILLIONS"
    const drawDateTH = new Date(draw.drawDate).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    })

    const totalTickets = draw.orders.reduce((s, o) => s + o.items.length, 0)
    const totalTHB = draw.orders.reduce((s, o) => s + Number(o.totalTHB), 0)
    const matchedCount = draw.orders.reduce(
      (s, o) => s + o.items.filter((i) => i.matchedAt).length,
      0
    )

    lines.push(``)
    lines.push(`${drawLabel} — งวด ${drawDateTH}`)
    lines.push(`รวม: ${draw.orders.length} ออเดอร์, ${totalTickets} ใบ`)
    lines.push(`ยอดรวม: ${totalTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿`)
    lines.push(`ตั๋วแล้ว: ${matchedCount}/${totalTickets} ใบ`)
    lines.push(`${"─".repeat(20)}`)

    for (const order of draw.orders) {
      const numbers = order.items
        .map((item) => `${item.mainNumbers} ●${item.specialNumber}`)
        .join(", ")
      lines.push(`• ${order.user.name}: ${numbers}`)
    }
  }

  lines.push(``)
  lines.push(`${"─".repeat(30)}`)
  lines.push(`⏳ รอตรวจสลิป: ${pendingApprovalCount} ออเดอร์`)
  lines.push(`💳 รอชำระ: ${pendingPaymentCount} ออเดอร์`)

  const message = lines.join("\n")

  return {
    message,
    generatedAt: now.toISOString(),
    draws: draws.map((d) => ({
      type: d.type,
      drawDate: d.drawDate,
      orderCount: d.orders.length,
      ticketCount: d.orders.reduce((s, o) => s + o.items.length, 0),
      totalTHB: d.orders.reduce((s, o) => s + Number(o.totalTHB), 0),
    })),
  }
}
