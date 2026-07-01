export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env")
    validateEnv()
    await registerTelegramWebhook()
    scheduleDailySales()
    scheduleResultsCheck()
    scheduleCancelUnpaid()
  }
}

const CANCEL_UNPAID_INTERVAL_MS = 15 * 60 * 1000

function scheduleCancelUnpaid() {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  const secret = process.env.CRON_SECRET
  if (!appUrl || appUrl.includes("localhost") || !secret) return

  function fire() {
    const url = `${appUrl!.replace(/\/$/, "")}/api/cron/cancel-unpaid?secret=${secret}`
    fetch(url).catch((err) => console.error("[cron] cancel-unpaid error:", err))
    setTimeout(fire, CANCEL_UNPAID_INTERVAL_MS)
  }

  setTimeout(fire, CANCEL_UNPAID_INTERVAL_MS)
  console.log("[cron] cancel-unpaid scheduled, every", CANCEL_UNPAID_INTERVAL_MS / 60000, "min")
}

// Draw times in LA: Powerball Mon/Wed/Sat 19:59, Mega Millions Tue/Fri 20:00
const RESULT_SCHEDULE = [
  { days: [1, 3, 6], hour: 19, minute: 59 },
  { days: [2, 5], hour: 20, minute: 0 },
]
// Fire at +40, +90, +150 min after each draw — NY API can take 1-2h to update
const RESULT_CHECK_OFFSETS_MIN = [40, 90, 150]

function scheduleResultsCheck() {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  const secret = process.env.CRON_SECRET
  if (!appUrl || appUrl.includes("localhost") || !secret) return

  const laOffsetMs = -7 * 60 * 60 * 1000 // PDT

  function msUntilNextCheck() {
    const now = new Date()
    const laNow = new Date(now.getTime() + laOffsetMs)

    let best: Date | null = null
    for (let offset = 0; offset <= 8; offset++) {
      const candidate = new Date(laNow)
      candidate.setUTCDate(laNow.getUTCDate() + offset)
      for (const sched of RESULT_SCHEDULE) {
        if (!sched.days.includes(candidate.getUTCDay())) continue
        for (const delayMin of RESULT_CHECK_OFFSETS_MIN) {
          const fireAt = new Date(candidate)
          // setUTCHours handles minute overflow (e.g. 59+150=209 → wraps correctly)
          fireAt.setUTCHours(sched.hour, sched.minute + delayMin, 0, 0)
          if (fireAt <= laNow) continue
          if (!best || fireAt < best) best = fireAt
        }
      }
    }
    if (!best) return 60 * 60 * 1000 // fallback: retry in 1h
    return best.getTime() - laNow.getTime()
  }

  function fire() {
    const url = `${appUrl!.replace(/\/$/, "")}/api/cron/sync-results?secret=${secret}`
    fetch(url).catch((err) => console.error("[cron] sync-results error:", err))
    setTimeout(fire, msUntilNextCheck())
  }

  setTimeout(fire, msUntilNextCheck())
  console.log("[cron] results-check scheduled, next run in", Math.round(msUntilNextCheck() / 60000), "min")
}

function scheduleDailySales() {
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  const secret = process.env.CRON_SECRET
  if (!appUrl || appUrl.includes("localhost") || !secret) return

  function msUntilNext8amLA() {
    const now = new Date()
    // LA is UTC-7 (PDT) or UTC-8 (PST) — use fixed -7 for simplicity
    const laOffsetMs = -7 * 60 * 60 * 1000
    const laMs = now.getTime() + laOffsetMs
    const laDate = new Date(laMs)
    const target = new Date(laMs)
    target.setUTCHours(8, 0, 0, 0)
    if (target <= laDate) target.setUTCDate(target.getUTCDate() + 1)
    return target.getTime() - laDate.getTime()
  }

  function fire() {
    const url = `${appUrl!.replace(/\/$/, "")}/api/cron/daily-sales?secret=${secret}`
    fetch(url).catch((err) => console.error("[cron] daily-sales error:", err))
    setTimeout(fire, msUntilNext8amLA())
  }

  setTimeout(fire, msUntilNext8amLA())
  console.log("[cron] daily-sales scheduled, next run in", Math.round(msUntilNext8amLA() / 60000), "min")
}

async function registerTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  if (!token || !appUrl || appUrl.includes("localhost")) return

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`
  const body: Record<string, string> = { url: webhookUrl }
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json() as { ok?: boolean; description?: string }
    if (data.ok) {
      console.log("[telegram] webhook registered:", webhookUrl)
    } else {
      console.error("[telegram] webhook registration failed:", data.description)
    }
  } catch (err) {
    console.error("[telegram] webhook registration error:", err)
  }
}
