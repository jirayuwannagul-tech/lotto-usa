import { describe, it, expect } from "vitest"
import { LOTTERY_RULES } from "@/lib/lottery-rules"

// Quick pick logic (same as DrawPicker)
function quickPick(type: "POWERBALL" | "MEGA_MILLIONS") {
  const rule = LOTTERY_RULES[type]
  const pool = (max: number) => Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"))
  const pick = (arr: string[], n: number) => {
    const a = [...arr]; const out: string[] = []
    while (out.length < n) { const i = Math.floor(Math.random() * a.length); out.push(a.splice(i, 1)[0]) }
    return out.sort()
  }
  return {
    main: pick(pool(rule.mainMax), rule.mainCount),
    special: pick(pool(rule.specialMax), 1)[0],
  }
}

describe("Quick pick - Powerball", () => {
  it("picks exactly 5 main numbers", () => {
    const { main } = quickPick("POWERBALL")
    expect(main).toHaveLength(5)
  })

  it("main numbers are unique", () => {
    const { main } = quickPick("POWERBALL")
    expect(new Set(main).size).toBe(5)
  })

  it("main numbers are within 01-69", () => {
    const { main } = quickPick("POWERBALL")
    for (const n of main) {
      const num = parseInt(n)
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(69)
    }
  })

  it("special number is within 01-26", () => {
    const { special } = quickPick("POWERBALL")
    const num = parseInt(special)
    expect(num).toBeGreaterThanOrEqual(1)
    expect(num).toBeLessThanOrEqual(26)
  })

  it("main numbers are sorted ascending", () => {
    const { main } = quickPick("POWERBALL")
    const sorted = [...main].sort()
    expect(main).toEqual(sorted)
  })
})

describe("Quick pick - Mega Millions", () => {
  it("picks exactly 5 main numbers", () => {
    const { main } = quickPick("MEGA_MILLIONS")
    expect(main).toHaveLength(5)
  })

  it("main numbers are within 01-70", () => {
    const { main } = quickPick("MEGA_MILLIONS")
    for (const n of main) {
      const num = parseInt(n)
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(70)
    }
  })

  it("special (Mega Ball) is within 01-25", () => {
    const { special } = quickPick("MEGA_MILLIONS")
    const num = parseInt(special)
    expect(num).toBeGreaterThanOrEqual(1)
    expect(num).toBeLessThanOrEqual(25)
  })
})

describe("Number formatting", () => {
  it("pads single digit to 2 chars", () => {
    expect(String(5).padStart(2, "0")).toBe("05")
    expect(String(1).padStart(2, "0")).toBe("01")
  })

  it("does not pad double digit", () => {
    expect(String(10).padStart(2, "0")).toBe("10")
    expect(String(69).padStart(2, "0")).toBe("69")
  })
})
