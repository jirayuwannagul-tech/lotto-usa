import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

  const todayLabel = now.toLocaleDateString("th-TH", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "2-digit",
  })

  // All APPROVED orders that still have no ticket photo (regardless of when created)
  const approvedOrders = await prisma.order.findMany({
    where: {
      status: "APPROVED",
      items: { some: { ticketPhotoUrl: null } },
    },
    include: { draw: true, items: true },
    orderBy: { draw: { drawDate: "asc" } },
  })

  // Orders waiting for admin slip review
  const pendingApprovalCount = await prisma.order.count({
    where: { status: "PENDING_APPROVAL" },
  })

  // Latest draw with results — check for winners
  const recentDraws = await prisma.draw.findMany({
    where: { winningMain: { not: null } },
    include: {
      orders: {
        where: { status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] } },
        include: { user: { select: { name: true } }, items: true },
      },
    },
    orderBy: { drawDate: "desc" },
    take: 1,
  })

  const lines: string[] = [
    `🌅 *สรุปประจำวัน — ${todayLabel}*`,
    ``,
  ]

  if (pendingApprovalCount > 0) {
    lines.push(`⏳ รอตรวจสลิป: *${pendingApprovalCount} ออเดอร์* — ตรวจที่ /admin/orders`)
    lines.push(``)
  }

  if (approvedOrders.length === 0) {
    lines.push(`✅ ไม่มีออเดอร์ที่ต้องซื้อตั๋ว`)
    return { message: lines.join("\n"), generatedAt: now.toISOString(), totalNeedBuy: 0 }
  }

  const drawMap = new Map<string, {
    drawType: string
    drawDateLabel: string
    tickets: { mainNumbers: string; specialNumber: string }[]
  }>()

  for (const order of approvedOrders) {
    const key = `${order.draw.type}|${order.draw.id}`
    if (!drawMap.has(key)) {
      const drawDateLabel = order.draw.drawDate.toLocaleDateString("th-TH", {
        timeZone: "America/Los_Angeles",
        weekday: "short",
        day: "numeric",
        month: "short",
      })
      drawMap.set(key, { drawType: order.draw.type, drawDateLabel, tickets: [] })
    }
    const group = drawMap.get(key)!
    for (const item of order.items.filter((i) => !i.ticketPhotoUrl)) {
      group.tickets.push({ mainNumbers: item.mainNumbers, specialNumber: item.specialNumber })
    }
  }

  let totalTickets = 0
  lines.push(`🎟 *ต้องซื้อตั๋ว:*`)
  lines.push(``)

  for (const group of drawMap.values()) {
    const drawLabel = group.drawType === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    totalTickets += group.tickets.length
    lines.push(`${drawLabel}  ${group.drawDateLabel}  (${group.tickets.length} ใบ)`)
    for (const t of group.tickets) {
      lines.push(`  \`${formatTicketLine(t.mainNumbers, t.specialNumber)}\``)
    }
    lines.push(``)
  }

  lines.push(`รวม *${totalTickets} ใบ* ที่ต้องซื้อ`)

  // Winner section
  if (recentDraws.length > 0) {
    lines.push(``, `🏆 *ผลรางวัลล่าสุด:*`, ``)
    for (const draw of recentDraws) {
      const drawLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
      const drawDateLabel = draw.drawDate.toLocaleDateString("th-TH", {
        timeZone: "America/Los_Angeles", day: "numeric", month: "short",
      })
      const winMain = draw.winningMain!.split(",").map((n) => n.trim().padStart(2, "0"))
      const winSpecial = draw.winningSpecial!.trim().padStart(2, "0")
      lines.push(`${drawLabel} ${drawDateLabel}: \`${winMain.join(" ")} ⭐${winSpecial}\``)

      const winners: string[] = []
      for (const order of draw.orders) {
        for (const item of order.items) {
          const itemMain = item.mainNumbers.split(",").map((n) => n.trim().padStart(2, "0")).sort()
          const matchMain = itemMain.filter((n) => winMain.includes(n)).length
          const matchSpecial = item.specialNumber.trim().padStart(2, "0") === winSpecial
          if (matchMain >= 1 || matchSpecial) {
            const prize = matchMain === 5 && matchSpecial ? "แจ็คพอต!" :
              matchMain === 5 ? "Match 5" : matchMain >= 3 ? `Match ${matchMain}${matchSpecial ? "+bonus" : ""}` :
              matchSpecial ? "Match bonus" : null
            if (prize) winners.push(`  🎉 ${order.user.name} — ${prize}`)
          }
        }
      }
      lines.push(winners.length > 0 ? winners.join("\n") : `  ✗ ไม่มีผู้ถูกรางวัล`)
    }
  }

  return {
    message: lines.join("\n"),
    generatedAt: now.toISOString(),
    totalNeedBuy: totalTickets,
  }
}
