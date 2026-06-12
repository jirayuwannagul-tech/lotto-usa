import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendRealtimeMessage } from "@/lib/telegram"

async function fetchPowerballResults() {
  const res = await fetch("https://data.ny.gov/resource/d6yy-54nr.json?$limit=10&$order=draw_date+DESC", {
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = await res.json() as { draw_date: string; winning_numbers: string }[]
  return data.map((row) => {
    const nums = row.winning_numbers.trim().split(" ")
    const pb = nums.pop()!
    return {
      type: "POWERBALL" as const,
      date: new Date(row.draw_date),
      mainNumbers: nums.map((n) => n.padStart(2, "0")).join(","),
      specialNumber: pb.padStart(2, "0"),
    }
  })
}

async function fetchMegaResults() {
  const res = await fetch("https://data.ny.gov/resource/5xaw-6ayf.json?$limit=10&$order=draw_date+DESC", {
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = await res.json() as { draw_date: string; winning_numbers: string; mega_ball: string }[]
  return data.map((row) => ({
    type: "MEGA_MILLIONS" as const,
    date: new Date(row.draw_date),
    mainNumbers: row.winning_numbers.trim().split(" ").map((n) => n.padStart(2, "0")).join(","),
    specialNumber: row.mega_ball.padStart(2, "0"),
  }))
}

function getPrizeLabel(type: string, matchMain: number, matchSpecial: boolean): string | null {
  const special = type === "POWERBALL" ? "Powerball" : "Mega Ball"
  if (matchMain === 5 && matchSpecial) return "🥇 แจ็คพอต!"
  if (matchMain === 5) return "🥈 Match 5"
  if (matchMain === 4 && matchSpecial) return `Match 4+${special}`
  if (matchMain === 4) return "Match 4"
  if (matchMain === 3 && matchSpecial) return `Match 3+${special}`
  if (matchMain === 3) return "Match 3"
  if (matchMain === 2 && matchSpecial) return `Match 2+${special}`
  if (matchMain === 1 && matchSpecial) return `Match 1+${special}`
  if (matchMain === 0 && matchSpecial) return `Match ${special}`
  return null
}

async function announceResult(draw: {
  id: string
  type: string
  drawDate: Date
  winningMain: string
  winningSpecial: string
}) {
  const typeLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const dateThai = draw.drawDate.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const winMain = draw.winningMain.split(",").map((n) => n.trim().padStart(2, "0"))
  const winSpecial = draw.winningSpecial.trim().padStart(2, "0")
  const specialLabel = draw.type === "POWERBALL" ? "PB" : "MB"
  const ballLine = `\`${winMain.join("  ")}  │ ${specialLabel} ${winSpecial}\``

  // Check winners
  const orders = await prisma.order.findMany({
    where: {
      drawId: draw.id,
      status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] },
    },
    include: { user: true, items: true },
  })

  const esc = (s: string) => s.replace(/[_*[\]`]/g, "\\$&")
  const winnerLines: string[] = []
  for (const order of orders) {
    for (const item of order.items) {
      const itemMain = item.mainNumbers.split(",").map((n) => n.trim().padStart(2, "0")).sort()
      const itemSpecial = item.specialNumber.trim().padStart(2, "0")
      const matchMain = itemMain.filter((n) => winMain.includes(n)).length
      const matchSpecial = itemSpecial === winSpecial
      const prize = getPrizeLabel(draw.type, matchMain, matchSpecial)
      if (prize) {
        winnerLines.push(`🏆 *${esc(order.user.name)}* — ${prize}`)
      }
    }
  }

  const totalOrders = orders.reduce((sum, o) => sum + o.items.length, 0)
  const winnerSection = winnerLines.length > 0
    ? `\n🎉 *ผู้ถูกรางวัล:*\n${winnerLines.join("\n")}`
    : `\n✗ ไม่มีผู้ถูกรางวัลในงวดนี้ (${totalOrders} ใบ)`

  const msg = [
    `🎱 *ผลหวย ${typeLabel}*`,
    `📅 งวด ${dateThai}`,
    ``,
    ballLine,
    winnerSection,
  ].join("\n")

  await sendRealtimeMessage(msg).catch((err) => console.error("[TG announce error]", err))
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.secret !== "SYNC_RESULTS_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const [pbResults, mmResults] = await Promise.all([fetchPowerballResults(), fetchMegaResults()])
  const all = [...pbResults, ...mmResults]

  let updated = 0
  let announced = 0

  for (const result of all) {
    const draw = await prisma.draw.findFirst({
      where: {
        type: result.type,
        drawDate: {
          gte: new Date(result.date.getTime() - 36 * 60 * 60 * 1000),
          lte: new Date(result.date.getTime() + 36 * 60 * 60 * 1000),
        },
      },
    })

    if (!draw) {
      const newDraw = await prisma.draw.create({
        data: {
          type: result.type,
          drawDate: result.date,
          cutoffAt: result.date,
          isOpen: false,
          winningMain: result.mainNumbers,
          winningSpecial: result.specialNumber,
          resultAnnouncedAt: new Date(),
        },
      })
      updated++
      await announceResult({
        id: newDraw.id,
        type: newDraw.type,
        drawDate: newDraw.drawDate,
        winningMain: result.mainNumbers,
        winningSpecial: result.specialNumber,
      })
      announced++
    } else if (!draw.winningMain) {
      const updatedDraw = await prisma.draw.update({
        where: { id: draw.id },
        data: {
          winningMain: result.mainNumbers,
          winningSpecial: result.specialNumber,
          resultAnnouncedAt: new Date(),
        },
      })
      updated++
      await announceResult({
        id: updatedDraw.id,
        type: updatedDraw.type,
        drawDate: updatedDraw.drawDate,
        winningMain: result.mainNumbers,
        winningSpecial: result.specialNumber,
      })
      announced++
    } else if (draw.winningMain && !draw.resultAnnouncedAt) {
      await prisma.draw.update({
        where: { id: draw.id },
        data: { resultAnnouncedAt: new Date() },
      })
      await announceResult({
        id: draw.id,
        type: draw.type,
        drawDate: draw.drawDate,
        winningMain: draw.winningMain,
        winningSpecial: draw.winningSpecial!,
      })
      announced++
    }
  }

  return NextResponse.json({ ok: true, fetched: all.length, updated, announced })
}

export async function GET() {
  const [pbResults, mmResults] = await Promise.all([fetchPowerballResults(), fetchMegaResults()])
  return NextResponse.json({ powerball: pbResults.slice(0, 3), megaMillions: mmResults.slice(0, 3) })
}
