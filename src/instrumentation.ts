export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env")
    validateEnv()
    await registerTelegramWebhook()
  }
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
