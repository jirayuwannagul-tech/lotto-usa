import { prisma } from "@/lib/prisma"

export async function getExchangeRate(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cached = await prisma.exchangeRate.findUnique({ where: { date: today } })
  if (cached) return Number(cached.usdToThb)

  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/THB`)
    const data = await res.json()
    const rate: number = data.conversion_rate ?? 35.0

    await prisma.exchangeRate.upsert({
      where: { date: today },
      update: { usdToThb: rate },
      create: { date: today, usdToThb: rate },
    })

    return rate
  } catch {
    return 35.0
  }
}
