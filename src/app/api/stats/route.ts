import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type") as DrawType | null

  if (!type || !LOTTERY_RULES[type]) {
    return NextResponse.json({ error: "type ไม่ถูกต้อง" }, { status: 400 })
  }

  const rule = LOTTERY_RULES[type]

  const draws = await prisma.draw.findMany({
    where: { type, winningMain: { not: null }, winningSpecial: { not: null } },
    orderBy: { drawDate: "desc" },
    take: 200,
    select: { winningMain: true, winningSpecial: true, drawDate: true },
  })

  const totalDraws = draws.length

  // Count frequencies
  const mainCount = new Map<string, number>()
  const specialCount = new Map<string, number>()

  for (const draw of draws) {
    if (!draw.winningMain || !draw.winningSpecial) continue
    for (const n of draw.winningMain.split(",").map((s) => s.trim())) {
      mainCount.set(n, (mainCount.get(n) ?? 0) + 1)
    }
    const sp = draw.winningSpecial.trim()
    specialCount.set(sp, (specialCount.get(sp) ?? 0) + 1)
  }

  const mainStats = Array.from({ length: rule.mainMax }, (_, i) => {
    const num = String(i + 1).padStart(2, "0")
    const count = mainCount.get(num) ?? 0
    return {
      number: num,
      count,
      pct: totalDraws > 0 ? Math.round((count / totalDraws) * 1000) / 10 : 0,
    }
  })

  const specialStats = Array.from({ length: rule.specialMax }, (_, i) => {
    const num = String(i + 1).padStart(2, "0")
    const count = specialCount.get(num) ?? 0
    return {
      number: num,
      count,
      pct: totalDraws > 0 ? Math.round((count / totalDraws) * 1000) / 10 : 0,
    }
  })

  // Latest draw date for "ข้อมูลล่าสุด" display
  const latestDrawDate = draws[0]?.drawDate ?? null

  return NextResponse.json(
    { totalDraws, mainStats, specialStats, latestDrawDate },
    {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    }
  )
}
