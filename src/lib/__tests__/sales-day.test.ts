import { describe, expect, it } from "vitest"
import { getSalesDayContext, getSalesDrawLabel, getSalesDrawType } from "@/lib/sales-day"

describe("sales day", () => {
  it("keeps orders before 7:00 AM in the same Los Angeles sales day", () => {
    const context = getSalesDayContext(new Date("2026-03-24T13:30:00.000Z"))
    expect(context.salesDateShortLabel).toContain("Tue 24 Mar 2026")
    expect(getSalesDrawType(new Date("2026-03-24T13:30:00.000Z"))).toBe("MEGA_MILLIONS")
  })

  it("rolls orders after 7:00 AM Los Angeles into the next sales day", () => {
    const context = getSalesDayContext(new Date("2026-03-24T15:30:00.000Z"))
    expect(context.salesDateShortLabel).toContain("Wed 25 Mar 2026")
    expect(getSalesDrawType(new Date("2026-03-24T15:30:00.000Z"))).toBe("POWERBALL")
  })

  it("returns a no-sales label for Los Angeles Sundays", () => {
    expect(getSalesDrawLabel(new Date("2026-03-29T12:00:00.000Z"))).toBe("ไม่มีรอบเปิดรับออเดอร์")
  })
})
