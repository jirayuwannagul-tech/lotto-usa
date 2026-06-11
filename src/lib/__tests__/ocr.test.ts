import { describe, it, expect } from "vitest"
import { normalizeNumbers, numbersMatch } from "../ocr"

describe("normalizeNumbers", () => {
  it("sorts and pads numbers", () => {
    expect(normalizeNumbers(["5", "3", "1", "20", "11"], "7"))
      .toBe("01,03,05,11,20|07")
  })

  it("handles already padded numbers", () => {
    expect(normalizeNumbers(["05", "11", "22", "36", "52"], "10"))
      .toBe("05,11,22,36,52|10")
  })

  it("sorts out-of-order numbers", () => {
    expect(normalizeNumbers(["52", "05", "36", "11", "22"], "10"))
      .toBe("05,11,22,36,52|10")
  })
})

describe("numbersMatch", () => {
  it("matches identical numbers", () => {
    expect(numbersMatch(
      "05,11,22,36,52", "10",
      ["05", "11", "22", "36", "52"], "10"
    )).toBe(true)
  })

  it("matches regardless of order", () => {
    expect(numbersMatch(
      "05,11,22,36,52", "10",
      ["52", "36", "22", "11", "05"], "10"
    )).toBe(true)
  })

  it("does not match different main numbers", () => {
    expect(numbersMatch(
      "05,11,22,36,52", "10",
      ["05", "11", "22", "36", "53"], "10"
    )).toBe(false)
  })

  it("does not match different special number", () => {
    expect(numbersMatch(
      "05,11,22,36,52", "10",
      ["05", "11", "22", "36", "52"], "11"
    )).toBe(false)
  })

  it("handles unpadded vs padded numbers", () => {
    expect(numbersMatch(
      "05,11,22,36,52", "10",
      ["5", "11", "22", "36", "52"], "10"
    )).toBe(true)
  })
})
