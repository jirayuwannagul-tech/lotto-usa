import type { DrawType, PrismaClient } from "@prisma/client"
import { fromZonedTime, toZonedTime } from "date-fns-tz"

const LA_TIME_ZONE = "America/Los_Angeles"
const DRAW_SYNC_LOCK_ID = 448021

const SCHEDULE: Record<DrawType, { days: number[]; hour: number; minute: number }> = {
  POWERBALL: { days: [1, 3, 6], hour: 22, minute: 59 },
  MEGA_MILLIONS: { days: [2, 5], hour: 23, minute: 0 },
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toZonedDateTimeString(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function buildDateInLosAngeles(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
) {
  return fromZonedTime(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`,
    LA_TIME_ZONE
  )
}

export function getNextDrawDates(type: DrawType, now = new Date()) {
  const schedule = SCHEDULE[type]
  const nowLA = toZonedTime(now, LA_TIME_ZONE)

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(nowLA)
    candidate.setDate(nowLA.getDate() + offset)
    if (!schedule.days.includes(candidate.getDay())) continue

    const drawDate = buildDateInLosAngeles(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      candidate.getDate(),
      schedule.hour,
      schedule.minute
    )
    const cutoffAt = buildDateInLosAngeles(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      candidate.getDate(),
      7,
      0
    )

    if (cutoffAt <= now) continue
    return { drawDate, cutoffAt }
  }

  return null
}

export function getNextDrawFormValues(type: DrawType, now = new Date()) {
  const dates = getNextDrawDates(type, now)
  if (!dates) return { drawDate: "", cutoffAt: "" }

  return {
    drawDate: toZonedDateTimeString(toZonedTime(dates.drawDate, "UTC")),
    cutoffAt: toZonedDateTimeString(toZonedTime(dates.cutoffAt, "UTC")),
  }
}

export async function syncUpcomingDraws(prisma: PrismaClient, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${DRAW_SYNC_LOCK_ID})`)

    const created: string[] = []

    for (const type of Object.keys(SCHEDULE) as DrawType[]) {
      const dates = getNextDrawDates(type, now)
      if (!dates) continue

      const existing = await tx.draw.findFirst({
        where: { type, drawDate: dates.drawDate },
      })

      if (!existing) {
        await tx.draw.create({
          data: {
            type,
            drawDate: dates.drawDate,
            cutoffAt: dates.cutoffAt,
          },
        })
        created.push(`${type} ${dates.drawDate.toISOString()}`)
      }
    }

    await tx.draw.updateMany({
      where: { isOpen: true, cutoffAt: { lt: now } },
      data: { isOpen: false },
    })

    return { created }
  })
}
