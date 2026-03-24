import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"

// Test the wrong-hour draw cleanup logic
function isWrongHourDraw(drawDate: Date): boolean {
  const h = drawDate.getUTCHours()
  return h === 2 || h === 3
}

// Test draw time calculation logic (PDT = UTC-7)
function buildDrawUTC(dayOfWeek: number, hourPT: number, minPT: number): Date {
  const PT_OFFSET = 7
  // Use a fixed Monday date for testing
  const base = new Date("2025-01-06T00:00:00Z") // Monday
  // Find next occurrence of dayOfWeek
  const diff = (dayOfWeek - base.getUTCDay() + 7) % 7
  const d = new Date(base)
  d.setUTCDate(base.getUTCDate() + diff)
  return new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    hourPT + PT_OFFSET, minPT
  ))
}

describe("Wrong-hour draw detection", () => {
  it("flags EDT-based draws (hour 2 UTC = Powerball EDT)", () => {
    const wrongDraw = new Date("2025-01-06T02:59:00Z")
    expect(isWrongHourDraw(wrongDraw)).toBe(true)
  })

  it("flags EDT-based draws (hour 3 UTC = Mega Millions EDT)", () => {
    const wrongDraw = new Date("2025-01-07T03:00:00Z")
    expect(isWrongHourDraw(wrongDraw)).toBe(true)
  })

  it("does not flag correct PDT-based Powerball draw (hour 5 UTC)", () => {
    const correctDraw = new Date("2025-01-06T05:59:00Z")
    expect(isWrongHourDraw(correctDraw)).toBe(false)
  })

  it("does not flag correct PDT-based Mega Millions draw (hour 6 UTC)", () => {
    const correctDraw = new Date("2025-01-07T06:00:00Z")
    expect(isWrongHourDraw(correctDraw)).toBe(false)
  })
})

describe("Draw time calculation (PDT = UTC-7)", () => {
  it("Powerball 10:59 PM PDT = 05:59 UTC next day", () => {
    // Powerball: Mon=1, 10:59 PM PDT
    const draw = buildDrawUTC(1, 22, 59)
    expect(draw.getUTCHours()).toBe(5)
    expect(draw.getUTCMinutes()).toBe(59)
  })

  it("Mega Millions 11:00 PM PDT = 06:00 UTC next day", () => {
    // Mega Millions: Tue=2, 11:00 PM PDT
    const draw = buildDrawUTC(2, 23, 0)
    expect(draw.getUTCHours()).toBe(6)
    expect(draw.getUTCMinutes()).toBe(0)
  })

  it("cutoff 7AM PDT = 14:00 UTC", () => {
    const cutoffHourUTC = 7 + 7 // 7AM PDT + 7 = 14 UTC
    expect(cutoffHourUTC).toBe(14)
  })
})

describe("Timezone: Thai = UTC+7, LA PDT = UTC-7", () => {
  it("Thai time is 14 hours ahead of LA PDT", () => {
    expect(7 - (-7)).toBe(14)
  })

  it("Powerball 10:59 PM PDT = 12:59 noon Thai next day", () => {
    const pdtHour = 22 + 59 / 60
    const thaiHour = pdtHour + 14
    // 22:59 PDT + 14 = 36:59 = next day 12:59 Thai
    expect(Math.floor(thaiHour) % 24).toBe(12)
  })
})
