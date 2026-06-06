import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage, sendRealtimeMessage } from "@/lib/telegram"

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

async function announceResult(draw: { id: string; type: string; drawDate: Date; winningMain: string; winningSpecial: string }) {
  const typeLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const dateThai = draw.drawDate.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const balls = draw.winningMain.split(",").map((n) => n.trim())
  const ballLine = balls.map((n) => `(${n})`).join("  ") + `  ⭐ *${draw.winningSpecial.trim()}*`

  const msg = `🎱 *ผลหวย ${typeLabel}*\n📅 งวด ${dateThai}\n\n${ballLine}\n\n_ตรวจสอบเลขในแดชบอร์ดของคุณได้เลย_`

  const tgResults = await Promise.allSettled([
    sendAdminMessage(msg),
    sendRealtimeMessage(msg),
  ])
  for (const r of tgResults) {
    if (r.status === "rejected") console.error("[TG announce error]", r.reason)
  }
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
      // No draw in DB for this date — create a closed historical record
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
      }).catch(() => {})
      announced++
    } else if (draw && !draw.winningMain) {
      const updated_draw = await prisma.draw.update({
        where: { id: draw.id },
        data: {
          winningMain: result.mainNumbers,
          winningSpecial: result.specialNumber,
          resultAnnouncedAt: new Date(),
        },
      })
      updated++
      await announceResult({
        id: updated_draw.id,
        type: updated_draw.type,
        drawDate: updated_draw.drawDate,
        winningMain: result.mainNumbers,
        winningSpecial: result.specialNumber,
      }).catch(() => {})
      announced++
    } else if (draw?.winningMain && draw.winningSpecial && !draw.resultAnnouncedAt) {
      await prisma.draw.update({
        where: { id: draw.id },
        data: { resultAnnouncedAt: new Date() },
      })
      await announceResult({
        id: draw.id,
        type: draw.type,
        drawDate: draw.drawDate,
        winningMain: draw.winningMain,
        winningSpecial: draw.winningSpecial,
      }).catch(() => {})
      announced++
    }
  }

  return NextResponse.json({ ok: true, fetched: all.length, updated, announced })
}

export async function GET() {
  const [pbResults, mmResults] = await Promise.all([fetchPowerballResults(), fetchMegaResults()])
  return NextResponse.json({ powerball: pbResults.slice(0, 3), megaMillions: mmResults.slice(0, 3) })
}
