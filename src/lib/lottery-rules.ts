export const LOTTERY_RULES = {
  POWERBALL: {
    name: "Powerball",
    mainCount: 5,
    mainMax: 69,
    specialMax: 26,
    specialLabel: "Powerball",
    color: "red",
    priceUSD: 2,
    sellPriceUSD: 3.5,
  },
  MEGA_MILLIONS: {
    name: "Mega Millions",
    mainCount: 5,
    mainMax: 69,
    specialMax: 26,
    specialLabel: "Mega Ball",
    color: "blue",
    priceUSD: 2,
    sellPriceUSD: 7,
  },
} as const

export type DrawType = keyof typeof LOTTERY_RULES

export const MARGIN_USD = 1.5
export const POWER_PLAY_OPTIONS = ["2x", "3x", "4x", "5x", "10x"] as const
export const POWER_PLAY_PRICE_USD = 1
export const PRIZE_COMMISSION_RATE = 0.1 // 10% on prizes >= $100
export const PRIZE_COMMISSION_THRESHOLD = 100
