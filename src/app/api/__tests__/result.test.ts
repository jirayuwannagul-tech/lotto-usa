import { describe, it, expect } from "vitest"

// Extract getPrizeLabel for testing (same logic as in result/route.ts)
function getPrizeLabel(type: string, matchMain: number, matchSpecial: boolean): string | null {
  const special = type === "POWERBALL" ? "Powerball" : "Mega Ball"
  if (matchMain === 5 && matchSpecial) return "🥇 แจ็คพอต!"
  if (matchMain === 5) return "🥈 Match 5"
  if (matchMain === 4 && matchSpecial) return `Match 4+${special}`
  if (matchMain === 4) return "Match 4"
  if (matchMain === 3 && matchSpecial) return `Match 3+${special}`
  if (matchMain === 3) return "Match 3"
  if (matchMain === 2 && matchSpecial) return `Match 2+${special}`
  if (matchMain === 1 && matchSpecial) return `Match 1+${special}`
  if (matchMain === 0 && matchSpecial) return `Match ${special}`
  return null
}

// Check winning numbers logic
function checkWinner(
  itemMain: string, itemSpecial: string,
  winMain: string[], winSpecial: string
): { matchMain: number; matchSpecial: boolean } {
  const itemNums = itemMain.split(",").map(n => n.trim().padStart(2, "0")).sort()
  const itemSpc = itemSpecial.trim().padStart(2, "0")
  const matchMain = itemNums.filter(n => winMain.includes(n)).length
  const matchSpecial = itemSpc === winSpecial
  return { matchMain, matchSpecial }
}

describe("getPrizeLabel - Powerball", () => {
  it("jackpot = 5 match + powerball", () => {
    expect(getPrizeLabel("POWERBALL", 5, true)).toBe("🥇 แจ็คพอต!")
  })
  it("match 5 only", () => {
    expect(getPrizeLabel("POWERBALL", 5, false)).toBe("🥈 Match 5")
  })
  it("match 4 + powerball", () => {
    expect(getPrizeLabel("POWERBALL", 4, true)).toBe("Match 4+Powerball")
  })
  it("match 4 only", () => {
    expect(getPrizeLabel("POWERBALL", 4, false)).toBe("Match 4")
  })
  it("match 3 + powerball", () => {
    expect(getPrizeLabel("POWERBALL", 3, true)).toBe("Match 3+Powerball")
  })
  it("match 3 only", () => {
    expect(getPrizeLabel("POWERBALL", 3, false)).toBe("Match 3")
  })
  it("match powerball only (0+special)", () => {
    expect(getPrizeLabel("POWERBALL", 0, true)).toBe("Match Powerball")
  })
  it("no match returns null", () => {
    expect(getPrizeLabel("POWERBALL", 0, false)).toBeNull()
    expect(getPrizeLabel("POWERBALL", 1, false)).toBeNull()
  })
})

describe("getPrizeLabel - Mega Millions", () => {
  it("jackpot", () => {
    expect(getPrizeLabel("MEGA_MILLIONS", 5, true)).toBe("🥇 แจ็คพอต!")
  })
  it("mega ball only", () => {
    expect(getPrizeLabel("MEGA_MILLIONS", 0, true)).toBe("Match Mega Ball")
  })
})

describe("checkWinner - number matching", () => {
  const winMain = ["05", "11", "22", "36", "52"]
  const winSpecial = "10"

  it("detects jackpot", () => {
    const r = checkWinner("05,11,22,36,52", "10", winMain, winSpecial)
    expect(r.matchMain).toBe(5)
    expect(r.matchSpecial).toBe(true)
  })

  it("detects partial match", () => {
    const r = checkWinner("05,11,22,01,02", "10", winMain, winSpecial)
    expect(r.matchMain).toBe(3)
    expect(r.matchSpecial).toBe(true)
  })

  it("detects no match", () => {
    const r = checkWinner("01,02,03,04,06", "09", winMain, winSpecial)
    expect(r.matchMain).toBe(0)
    expect(r.matchSpecial).toBe(false)
  })

  it("handles unpadded numbers", () => {
    const r = checkWinner("5,11,22,36,52", "10", winMain, winSpecial)
    expect(r.matchMain).toBe(5)
  })
})
