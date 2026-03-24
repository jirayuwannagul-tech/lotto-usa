import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({
    error: "TELEGRAM_BOT_TOKEN not set",
    debug: {
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasChatIds: !!process.env.TELEGRAM_ADMIN_CHAT_IDS,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV,
    }
  }, { status: 500 })

  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  if (!appUrl || appUrl.includes("localhost")) {
    return NextResponse.json({ error: "APP_URL not set — add APP_URL=https://your-app.railway.app in Railway Variables" }, { status: 500 })
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`

  const body: Record<string, string> = { url: webhookUrl }
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json({ webhookUrl, result: data })
}
