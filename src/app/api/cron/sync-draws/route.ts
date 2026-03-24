import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Draw schedule (ET days): Powerball Mon/Wed/Sat, Mega Millions Tue/Fri
const SCHEDULE = {
  POWERBALL:     { days: [1, 3, 6], hourPT: 22, minPT: 59 }, // 10:59 PM PDT = 05:59 UTC = 12:59 Thai
  MEGA_MILLIONS: { days: [2, 5],    hourPT: 23, minPT: 0  }, // 11:00 PM PDT = 06:00 UTC = 13:00 Thai
}
const PT_OFFSET = 7 // PDT = UTC-7

function buildDrawDates(type: keyof typeof SCHEDULE, refDatePT: Date) {
  const s = SCHEDULE[type]
  for (let i = 0; i <= 7; i++) {
    const d = new Date(refDatePT)
    d.setUTCDate(refDatePT.getUTCDate() + i)
    if (!s.days.includes(d.getUTCDay())) continue
    const drawUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.hourPT + PT_OFFSET, s.minPT))
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
  const nowET = new Date(now.getTime() - PT_OFFSET * 3600000)
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

  // Remove draws with wrong UTC draw-time (EDT-based: hour 2 or 3 UTC instead of correct 5 or 6 UTC)
  const openDraws = await prisma.draw.findMany({ where: { isOpen: true } })
  const wrongDrawIds = openDraws
    .filter((d) => { const h = d.drawDate.getUTCHours(); return h === 2 || h === 3 })
    .map((d) => d.id)
  if (wrongDrawIds.length > 0) {
    await prisma.draw.deleteMany({ where: { id: { in: wrongDrawIds } } })
  }

  // Auto-close draws past cutoff
  await prisma.draw.updateMany({
    where: { isOpen: true, cutoffAt: { lt: now } },
    data: { isOpen: false },
  })

  return NextResponse.json({ created })
}
