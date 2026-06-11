import { describe, it, expect } from "vitest"
import { formatInTimeZone } from "date-fns-tz"
import { getNextDrawDates } from "@/lib/draw-schedule"

describe("getNextDrawDates", () => {
  it("uses DST-aware Los Angeles time in January for Powerball", () => {
    const result = getNextDrawDates("POWERBALL", new Date("2025-01-06T00:00:00Z"))
    expect(result).not.toBeNull()
    expect(result?.drawDate.toISOString()).toBe("2025-01-07T03:59:00.000Z")
    expect(result?.cutoffAt.toISOString()).toBe("2025-01-06T15:00:00.000Z")
  })

  it("uses DST-aware Los Angeles time in June for Mega Millions", () => {
    const result = getNextDrawDates("MEGA_MILLIONS", new Date("2025-06-03T00:00:00Z"))
    expect(result).not.toBeNull()
    expect(result?.drawDate.toISOString()).toBe("2025-06-04T03:00:00.000Z")
    expect(result?.cutoffAt.toISOString()).toBe("2025-06-03T14:00:00.000Z")
  })

  it("keeps local Los Angeles wall-clock times stable across seasons", () => {
    const winter = getNextDrawDates("POWERBALL", new Date("2025-01-06T00:00:00Z"))
    const summer = getNextDrawDates("POWERBALL", new Date("2025-06-02T00:00:00Z"))
    expect(formatInTimeZone(winter!.drawDate, "America/Los_Angeles", "HH:mm")).toBe("19:59")
    expect(formatInTimeZone(summer!.drawDate, "America/Los_Angeles", "HH:mm")).toBe("19:59")
  })
})
