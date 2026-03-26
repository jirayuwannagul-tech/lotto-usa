const POWERBALL_HOME_URL = "https://www.powerball.com/"
const MEGA_MILLIONS_DATA_URL = "https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData"

function formatJackpotFromNumber(value: number) {
  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000
    const formatted = Number.isInteger(billions) ? String(billions) : billions.toFixed(1)
    return `$${formatted} Billion`
  }

  const millions = value / 1_000_000
  const formatted = Number.isInteger(millions) ? String(millions) : millions.toFixed(1)
  return `$${formatted} Million`
}

export async function fetchPowerballJackpot() {
  const response = await fetch(POWERBALL_HOME_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 LottoUSA Jackpot Sync",
    },
  })

  if (!response.ok) {
    throw new Error(`Powerball homepage returned ${response.status}`)
  }

  const html = await response.text()
  const match = html.match(
    /Estimated Jackpot[\s\S]*?<span class="game-jackpot-number[^"]*">\s*([^<]+?)\s*<\/span>/i
  )

  return match?.[1]?.trim() ?? null
}

export async function fetchMegaMillionsJackpot() {
  const response = await fetch(MEGA_MILLIONS_DATA_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "Mozilla/5.0 LottoUSA Jackpot Sync",
    },
    body: "{}",
  })

  if (!response.ok) {
    throw new Error(`Mega Millions endpoint returned ${response.status}`)
  }

  const payload = (await response.json()) as { d?: string }
  if (!payload?.d) return null

  const data = JSON.parse(payload.d) as {
    Jackpot?: { NextPrizePool?: number }
  }

  const nextPrizePool = data?.Jackpot?.NextPrizePool
  if (!nextPrizePool || Number.isNaN(nextPrizePool)) return null

  return formatJackpotFromNumber(nextPrizePool)
}
