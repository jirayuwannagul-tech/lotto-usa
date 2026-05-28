import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function fetchPowerballResults() {
  const res = await fetch("https://data.ny.gov/resource/d6yy-54nr.json?$limit=10&$order=draw_date+DESC", {
    next: { revalidate: 0 },
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
    next: { revalidate: 0 },
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (body.secret !== "SYNC_RESULTS_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const [pbResults, mmResults] = await Promise.all([fetchPowerballResults(), fetchMegaResults()])
  const all = [...pbResults, ...mmResults]

  let updated = 0
  for (const result of all) {
    const draw = await prisma.draw.findFirst({
      where: {
        type: result.type,
        drawDate: {
          gte: new Date(result.date.getTime() - 12 * 60 * 60 * 1000),
          lte: new Date(result.date.getTime() + 12 * 60 * 60 * 1000),
        },
      },
    })
    if (draw && !draw.winningMain) {
      await prisma.draw.update({
        where: { id: draw.id },
        data: { winningMain: result.mainNumbers, winningSpecial: result.specialNumber },
      })
      updated++
    }
  }

  return NextResponse.json({ ok: true, fetched: all.length, updated })
}

export async function GET() {
  const [pbResults, mmResults] = await Promise.all([fetchPowerballResults(), fetchMegaResults()])
  return NextResponse.json({ powerball: pbResults.slice(0, 3), megaMillions: mmResults.slice(0, 3) })
}
