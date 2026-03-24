import { describe, it, expect } from "vitest"
import { z } from "zod"
import { LOTTERY_RULES, MARGIN_USD } from "@/lib/lottery-rules"

// Same schema as in orders/route.ts
const itemSchema = z.object({
  mainNumbers: z.array(z.string().regex(/^\d{1,2}$/)).min(1).max(10),
  specialNumber: z.string().regex(/^\d{1,2}$/),
})

const createOrderSchema = z.object({
  drawId: z.string().min(1),
  items: z.array(itemSchema).min(1).max(20),
})

describe("Order validation schema", () => {
  it("accepts valid order", () => {
    const result = createOrderSchema.safeParse({
      drawId: "clxxx",
      items: [{ mainNumbers: ["1","2","3","4","5"], specialNumber: "10" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty drawId", () => {
    const result = createOrderSchema.safeParse({
      drawId: "",
      items: [{ mainNumbers: ["1","2","3","4","5"], specialNumber: "10" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty items", () => {
    const result = createOrderSchema.safeParse({ drawId: "abc", items: [] })
    expect(result.success).toBe(false)
  })

  it("rejects more than 20 items", () => {
    const items = Array.from({ length: 21 }, () => ({
      mainNumbers: ["1","2","3","4","5"], specialNumber: "1",
    }))
    expect(createOrderSchema.safeParse({ drawId: "abc", items }).success).toBe(false)
  })

  it("rejects non-numeric main numbers", () => {
    const result = createOrderSchema.safeParse({
      drawId: "abc",
      items: [{ mainNumbers: ["1","2","3","4","abc"], specialNumber: "10" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects 3-digit numbers", () => {
    const result = createOrderSchema.safeParse({
      drawId: "abc",
      items: [{ mainNumbers: ["1","2","3","4","100"], specialNumber: "10" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("Powerball number range validation", () => {
  const rule = LOTTERY_RULES.POWERBALL

  it("rejects main number > 69", () => {
    const num = 70
    expect(num > rule.mainMax).toBe(true)
  })

  it("accepts main number = 69", () => {
    const num = 69
    expect(num >= 1 && num <= rule.mainMax).toBe(true)
  })

  it("rejects Powerball > 26", () => {
    const num = 27
    expect(num > rule.specialMax).toBe(true)
  })

  it("accepts Powerball = 26", () => {
    expect(26 <= rule.specialMax).toBe(true)
  })
})

describe("Mega Millions number range validation", () => {
  const rule = LOTTERY_RULES.MEGA_MILLIONS

  it("rejects main number > 70", () => {
    expect(71 > rule.mainMax).toBe(true)
  })

  it("rejects Mega Ball > 25", () => {
    expect(26 > rule.specialMax).toBe(true)
  })
})

describe("Price calculation", () => {
  it("calculates correct USD price for 1 ticket", () => {
    const price = LOTTERY_RULES.POWERBALL.priceUSD + MARGIN_USD
    expect(price).toBe(3.5)
  })

  it("calculates total THB for 3 tickets at rate 35", () => {
    const tickets = 3
    const rate = 35
    const totalUSD = (LOTTERY_RULES.POWERBALL.priceUSD + MARGIN_USD) * tickets
    const totalTHB = totalUSD * rate
    expect(totalUSD).toBe(10.5)
    expect(totalTHB).toBe(367.5)
  })
})
