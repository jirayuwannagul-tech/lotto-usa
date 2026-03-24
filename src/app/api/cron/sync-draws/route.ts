import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Draw schedule (ET days): Powerball Mon/Wed/Sat, Mega Millions Tue/Fri
const SCHEDULE = {
  POWERBALL:     { days: [1, 3, 6], hourET: 22, minET: 59 },
  MEGA_MILLIONS: { days: [2, 5],    hourET: 23, minET: 0  },
}
const ET_OFFSET = 4 // EDT = UTC-4

function buildDrawDates(type: keyof typeof SCHEDULE, refDateET: Date) {
  const s = SCHEDULE[type]
  for (let i = 0; i <= 7; i++) {
    const d = new Date(refDateET)
    d.setUTCDate(refDateET.getUTCDate() + i)
    if (!s.days.includes(d.getUTCDay())) continue
    const drawUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.hourET + ET_OFFSET, s.minET))
    const cutoffUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 0))
    if (cutoffUTC > new Date()) return { drawDate: drawUTC, cutoffAt: cutoffUTC }
  }
  return null
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const nowET = new Date(now.getTime() - ET_OFFSET * 3600000)
  const created: string[] = []

  for (const type of ["POWERBALL", "MEGA_MILLIONS"] as const) {
    const dates = buildDrawDates(type, nowET)
    if (!dates) continue

    const exists = await prisma.draw.findFirst({
      where: { type, drawDate: dates.drawDate },
    })
    if (!exists) {
      await prisma.draw.create({ data: { type, ...dates } })
      created.push(`${type} ${dates.drawDate.toISOString()}`)
    }
  }

  // Auto-close draws past cutoff
  await prisma.draw.updateMany({
    where: { isOpen: true, cutoffAt: { lt: now } },
    data: { isOpen: false },
  })

  return NextResponse.json({ created })
}
