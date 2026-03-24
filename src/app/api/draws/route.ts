import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createDrawSchema = z.object({
  type: z.enum(["POWERBALL", "MEGA_MILLIONS"]),
  drawDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  cutoffAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  jackpot: z.string().max(50).optional(),
})

export async function GET(req: NextRequest) {
  const all = new URL(req.url).searchParams.get("all") === "1"
  const draws = await prisma.draw.findMany({
    where: all ? undefined : { isOpen: true },
    orderBy: { drawDate: "desc" },
  })
  return NextResponse.json(draws)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createDrawSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { type, drawDate, cutoffAt, jackpot } = parsed.data

  const drawDateParsed = new Date(drawDate)
  const cutoffAtParsed = new Date(cutoffAt)

  if (isNaN(drawDateParsed.getTime()) || isNaN(cutoffAtParsed.getTime())) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 })
  }

  if (cutoffAtParsed >= drawDateParsed) {
    return NextResponse.json(
      { error: "เวลาปิดรับต้องก่อนวันออกรางวัล" },
      { status: 400 }
    )
  }

  const draw = await prisma.draw.create({
    data: {
      type,
      drawDate: drawDateParsed,
      cutoffAt: cutoffAtParsed,
      jackpot: jackpot || null,
    },
  })

  return NextResponse.json(draw)
}
