import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 })

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL
  if (!appUrl) return NextResponse.json({ error: "NEXTAUTH_URL not set" }, { status: 500 })

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
