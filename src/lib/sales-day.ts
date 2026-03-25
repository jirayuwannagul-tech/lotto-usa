import type { DrawType } from "@prisma/client"
import { fromZonedTime, formatInTimeZone, toZonedTime } from "date-fns-tz"

export const LA_TIME_ZONE = "America/Los_Angeles"
export const SALES_ROLLOVER_HOUR = 7

const SALES_DRAW_BY_WEEKDAY: Record<number, DrawType | null> = {
  0: null,
  1: "POWERBALL",
  2: "MEGA_MILLIONS",
  3: "POWERBALL",
  4: null,
  5: "MEGA_MILLIONS",
  6: "POWERBALL",
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function buildLosAngelesDate(dateInLosAngeles: Date, hour: number, minute: number) {
  return fromZonedTime(
    `${dateInLosAngeles.getFullYear()}-${pad(dateInLosAngeles.getMonth() + 1)}-${pad(dateInLosAngeles.getDate())}T${pad(hour)}:${pad(minute)}:00`,
    LA_TIME_ZONE
  )
}

export function getLosAngelesNow(now = new Date()) {
  return toZonedTime(now, LA_TIME_ZONE)
}

export function getSalesDateInLosAngeles(now = new Date()) {
  const losAngelesNow = getLosAngelesNow(now)
  const salesDate = new Date(losAngelesNow)

  if (salesDate.getHours() >= SALES_ROLLOVER_HOUR) {
    salesDate.setDate(salesDate.getDate() + 1)
  }

  return salesDate
}

export function getSalesDrawType(now = new Date()) {
  const salesDate = getSalesDateInLosAngeles(now)
  return SALES_DRAW_BY_WEEKDAY[salesDate.getDay()]
}

export function getSalesDrawLabel(now = new Date()) {
  const type = getSalesDrawType(now)
  if (type === "POWERBALL") return "Power Ball"
  if (type === "MEGA_MILLIONS") return "Mega Ball"
  return "ไม่มีรอบเปิดรับออเดอร์"
}

export function getSalesDayContext(now = new Date()) {
  const salesDateInLosAngeles = getSalesDateInLosAngeles(now)
  const currentSalesDayStart = buildLosAngelesDate(salesDateInLosAngeles, SALES_ROLLOVER_HOUR, 0)
  const previousSalesDate = new Date(salesDateInLosAngeles)
  previousSalesDate.setDate(previousSalesDate.getDate() - 1)
  const previousSalesDayStart = buildLosAngelesDate(previousSalesDate, SALES_ROLLOVER_HOUR, 0)

  return {
    timeZone: LA_TIME_ZONE,
    rollOverHour: SALES_ROLLOVER_HOUR,
    salesDateInLosAngeles,
    windowStart: previousSalesDayStart,
    windowEnd: currentSalesDayStart,
    drawType: SALES_DRAW_BY_WEEKDAY[salesDateInLosAngeles.getDay()],
    drawLabel: getSalesDrawLabel(now),
    salesDateLabel: formatInTimeZone(
      currentSalesDayStart,
      LA_TIME_ZONE,
      "EEEE d MMMM yyyy"
    ),
    salesDateShortLabel: formatInTimeZone(currentSalesDayStart, LA_TIME_ZONE, "EEE d MMM yyyy"),
    currentTimeLabel: formatInTimeZone(now, LA_TIME_ZONE, "EEE d MMM yyyy HH:mm zzz"),
    isAfterRollOver: getLosAngelesNow(now).getHours() >= SALES_ROLLOVER_HOUR,
  }
}
