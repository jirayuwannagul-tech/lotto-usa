import { describe, it, expect } from "vitest"
import { isCutoffPassed, formatCutoffLocal, getNextCutoff } from "../cutoff"

describe("isCutoffPassed", () => {
  it("returns true if cutoff is in the past", () => {
    const past = new Date(Date.now() - 60_000)
    expect(isCutoffPassed(past)).toBe(true)
  })

  it("returns false if cutoff is in the future", () => {
    const future = new Date(Date.now() + 60_000)
    expect(isCutoffPassed(future)).toBe(false)
  })

  it("returns true for cutoff exactly at now (within ms)", () => {
    const justPast = new Date(Date.now() - 1)
    expect(isCutoffPassed(justPast)).toBe(true)
  })
})

describe("getNextCutoff", () => {
  it("returns the same date as input", () => {
    const d = new Date("2025-01-15T14:00:00Z")
    expect(getNextCutoff(d).getTime()).toBe(d.getTime())
  })
})

describe("formatCutoffLocal", () => {
  it("returns a non-empty string", () => {
    const d = new Date("2025-01-15T14:00:00Z")
    expect(typeof formatCutoffLocal(d)).toBe("string")
    expect(formatCutoffLocal(d).length).toBeGreaterThan(0)
  })
})
