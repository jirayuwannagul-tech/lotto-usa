import { describe, it, expect } from "vitest"
import { LOTTERY_RULES, MARGIN_USD, PRIZE_COMMISSION_RATE } from "../lottery-rules"

describe("LOTTERY_RULES", () => {
  describe("POWERBALL", () => {
    const rule = LOTTERY_RULES.POWERBALL
    it("has correct mainCount", () => expect(rule.mainCount).toBe(5))
    it("mainMax is 69", () => expect(rule.mainMax).toBe(69))
    it("specialMax is 26", () => expect(rule.specialMax).toBe(26))
    it("priceUSD is 2", () => expect(rule.priceUSD).toBe(2))
    it("specialLabel is Powerball", () => expect(rule.specialLabel).toBe("Powerball"))
  })

  describe("MEGA_MILLIONS", () => {
    const rule = LOTTERY_RULES.MEGA_MILLIONS
    it("has correct mainCount", () => expect(rule.mainCount).toBe(5))
    it("mainMax is 70", () => expect(rule.mainMax).toBe(70))
    it("specialMax is 25", () => expect(rule.specialMax).toBe(25))
    it("priceUSD is 2", () => expect(rule.priceUSD).toBe(2))
    it("specialLabel is Mega Ball", () => expect(rule.specialLabel).toBe("Mega Ball"))
  })

  it("MARGIN_USD is 1.5", () => expect(MARGIN_USD).toBe(1.5))
  it("PRIZE_COMMISSION_RATE is 10%", () => expect(PRIZE_COMMISSION_RATE).toBe(0.1))

  it("total ticket price is priceUSD + MARGIN_USD", () => {
    expect(LOTTERY_RULES.POWERBALL.priceUSD + MARGIN_USD).toBe(3.5)
    expect(LOTTERY_RULES.MEGA_MILLIONS.priceUSD + MARGIN_USD).toBe(3.5)
  })
})
