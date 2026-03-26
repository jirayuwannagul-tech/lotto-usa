import type { Draw, DrawType, PrismaClient } from "@prisma/client"
import { fromZonedTime, toZonedTime } from "date-fns-tz"
import { SALES_ROLLOVER_HOUR } from "@/lib/sales-day"
import { fetchMegaMillionsJackpot, fetchPowerballJackpot } from "@/lib/jackpot-source"

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

export function getPurchasableDrawDates(type: DrawType, now = new Date()) {
  const schedule = SCHEDULE[type]
  const nowLA = toZonedTime(now, LA_TIME_ZONE)
  const salesAnchor = new Date(nowLA)

  if (salesAnchor.getHours() >= SALES_ROLLOVER_HOUR) {
    salesAnchor.setDate(salesAnchor.getDate() + 1)
  }

  for (let offset = 0; offset <= 14; offset++) {
    const candidate = new Date(salesAnchor)
    candidate.setDate(salesAnchor.getDate() + offset)
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
      SALES_ROLLOVER_HOUR,
      0
    )

    return { drawDate, cutoffAt }
  }

  return null
}

async function ensureDrawRecord(
  prisma: PrismaClient,
  type: DrawType,
  dates: { drawDate: Date; cutoffAt: Date }
): Promise<Draw> {
  const existing = await prisma.draw.findFirst({
    where: { type, drawDate: dates.drawDate },
  })

  if (existing) return existing

  return prisma.draw.create({
    data: {
      type,
      drawDate: dates.drawDate,
      cutoffAt: dates.cutoffAt,
    },
  })
}

export async function getPurchasableDraw(prisma: PrismaClient, type: DrawType, now = new Date()) {
  const dates = getPurchasableDrawDates(type, now)
  if (!dates) return null
  return ensureDrawRecord(prisma, type, dates)
}

export function getNextDrawFormValues(type: DrawType, now = new Date()) {
  const dates = getNextDrawDates(type, now)
  if (!dates) return { drawDate: "", cutoffAt: "" }

  return {
    drawDate: toZonedDateTimeString(toZonedTime(dates.drawDate, "UTC")),
    cutoffAt: toZonedDateTimeString(toZonedTime(dates.cutoffAt, "UTC")),
  }
}

async function syncUpcomingJackpots(prisma: PrismaClient, now: Date) {
  const [powerballJackpot, megaMillionsJackpot] = await Promise.all([
    fetchPowerballJackpot().catch((error) => {
      console.error("Failed to fetch Powerball jackpot", error)
      return null
    }),
    fetchMegaMillionsJackpot().catch((error) => {
      console.error("Failed to fetch Mega Millions jackpot", error)
      return null
    }),
  ])

  const updates: Promise<unknown>[] = []

  if (powerballJackpot) {
    updates.push(
      prisma.draw.updateMany({
        where: {
          type: "POWERBALL",
          isOpen: true,
          drawDate: { gte: now },
        },
        data: { jackpot: powerballJackpot },
      })
    )
  }

  if (megaMillionsJackpot) {
    updates.push(
      prisma.draw.updateMany({
        where: {
          type: "MEGA_MILLIONS",
          isOpen: true,
          drawDate: { gte: now },
        },
        data: { jackpot: megaMillionsJackpot },
      })
    )
  }

  await Promise.all(updates)
}

export async function syncUpcomingDraws(prisma: PrismaClient, now = new Date()) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${DRAW_SYNC_LOCK_ID})`)

    const created: string[] = []

    for (const type of Object.keys(SCHEDULE) as DrawType[]) {
      const upcomingDates = [getNextDrawDates(type, now), getPurchasableDrawDates(type, now)].filter(
        (value): value is { drawDate: Date; cutoffAt: Date } => Boolean(value)
      )

      for (const dates of upcomingDates) {
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
    }

    await tx.draw.updateMany({
      where: { isOpen: true, drawDate: { lt: now } },
      data: { isOpen: false },
    })

    return { created }
  })

  await syncUpcomingJackpots(prisma, now)

  return result
}
