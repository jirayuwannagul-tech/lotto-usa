import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

function parseAndValidate(
  type: DrawType,
  rawMain: string,
  rawSpecial: string,
) {
  const rule = LOTTERY_RULES[type]
  const mainNumbers = rawMain
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))

  if (mainNumbers.length !== rule.mainCount) {
    throw new Error(`ต้องกรอกเลขหลัก ${rule.mainCount} ตัว`)
  }
  if (mainNumbers.some((n) => isNaN(n) || n < 1 || n > rule.mainMax)) {
    throw new Error(`เลขหลักต้องอยู่ระหว่าง 1-${rule.mainMax}`)
  }
  if (new Set(mainNumbers).size !== mainNumbers.length) {
    throw new Error("เลขหลักห้ามซ้ำกัน")
  }

  const specialNumber = parseInt(rawSpecial.trim(), 10)
  if (isNaN(specialNumber) || specialNumber < 1 || specialNumber > rule.specialMax) {
    throw new Error(`${rule.specialLabel} ต้องอยู่ระหว่าง 1-${rule.specialMax}`)
  }

  return {
    winningMain: mainNumbers.map((n) => String(n).padStart(2, "0")).sort().join(","),
    winningSpecial: String(specialNumber).padStart(2, "0"),
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { type, drawDate, winningMain, winningSpecial } = body ?? {}

  if (!type || !drawDate || !winningMain || !winningSpecial) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
  }

  if (!["POWERBALL", "MEGA_MILLIONS"].includes(type)) {
    return NextResponse.json({ error: "ประเภทไม่ถูกต้อง" }, { status: 400 })
  }

  const drawDateParsed = new Date(drawDate)
  if (isNaN(drawDateParsed.getTime())) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 })
  }

  let normalized: { winningMain: string; winningSpecial: string }
  try {
    normalized = parseAndValidate(type as DrawType, winningMain, winningSpecial)
  } catch (err) {
    const message = err instanceof Error ? err.message : "ข้อมูลไม่ถูกต้อง"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Check for duplicate
  const existing = await prisma.draw.findFirst({
    where: { type: type as DrawType, drawDate: drawDateParsed },
  })
  if (existing) {
    return NextResponse.json({ error: "มีผลรางวัลงวดนี้อยู่แล้ว" }, { status: 409 })
  }

  // cutoffAt = 1 hour before draw (historical — doesn't matter functionally)
  const cutoffAt = new Date(drawDateParsed.getTime() - 60 * 60 * 1000)

  const draw = await prisma.draw.create({
    data: {
      id: crypto.randomUUID(),
      type: type as DrawType,
      drawDate: drawDateParsed,
      cutoffAt,
      isOpen: false,
      winningMain: normalized.winningMain,
      winningSpecial: normalized.winningSpecial,
    },
  })

  return NextResponse.json(draw, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const type = new URL(req.url).searchParams.get("type") as DrawType | null

  const draws = await prisma.draw.findMany({
    where: {
      winningMain: { not: null },
      ...(type ? { type } : {}),
    },
    orderBy: { drawDate: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      drawDate: true,
      winningMain: true,
      winningSpecial: true,
    },
  })

  return NextResponse.json(draws)
}
