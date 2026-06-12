import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

function weightedPickWithoutReplacement(
  pool: string[],
  weights: Map<string, number>,
  count: number,
): string[] {
  const remaining = [...pool]
  const picked: string[] = []

  while (picked.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, n) => sum + (weights.get(n) ?? 1), 0)
    let r = Math.random() * totalWeight
    let chosen = remaining[0]
    for (const n of remaining) {
      r -= weights.get(n) ?? 1
      if (r <= 0) {
        chosen = n
        break
      }
    }
    picked.push(chosen)
    remaining.splice(remaining.indexOf(chosen), 1)
  }

  return picked.sort()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") as DrawType | null
  const count = Math.min(10, Math.max(1, parseInt(searchParams.get("count") ?? "1", 10)))

  if (!type || !LOTTERY_RULES[type]) {
    return NextResponse.json({ error: "type ไม่ถูกต้อง" }, { status: 400 })
  }

  const rule = LOTTERY_RULES[type]

  // Fetch last 200 completed draws for this type
  const pastDraws = await prisma.draw.findMany({
    where: { type, winningMain: { not: null }, winningSpecial: { not: null } },
    orderBy: { drawDate: "desc" },
    take: 200,
    select: { winningMain: true, winningSpecial: true },
  })

  // Build frequency maps
  const mainFreq = new Map<string, number>()
  const specialFreq = new Map<string, number>()

  for (const draw of pastDraws) {
    if (!draw.winningMain || !draw.winningSpecial) continue
    for (const n of draw.winningMain.split(",").map((s) => s.trim())) {
      mainFreq.set(n, (mainFreq.get(n) ?? 0) + 1)
    }
    const sp = draw.winningSpecial.trim()
    specialFreq.set(sp, (specialFreq.get(sp) ?? 0) + 1)
  }

  const basedOnDraws = pastDraws.length

  // Build weighted pools — base weight 1 so unseen numbers still get picked
  const mainPool = Array.from({ length: rule.mainMax }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  )
  const mainWeights = new Map<string, number>()
  for (const n of mainPool) {
    mainWeights.set(n, (mainFreq.get(n) ?? 0) + 1)
  }

  const specialPool = Array.from({ length: rule.specialMax }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  )
  const specialWeights = new Map<string, number>()
  for (const n of specialPool) {
    specialWeights.set(n, (specialFreq.get(n) ?? 0) + 1)
  }

  // Generate requested number of sets
  const sets = Array.from({ length: count }, () => ({
    mainNumbers: weightedPickWithoutReplacement(mainPool, mainWeights, rule.mainCount),
    specialNumber: weightedPickWithoutReplacement(specialPool, specialWeights, 1)[0],
  }))

  return NextResponse.json({ sets, basedOnDraws })
}
