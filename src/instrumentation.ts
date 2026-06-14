export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env")
    validateEnv()
    await registerTelegramWebhook()
    scheduleDailySales()
  }
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
