import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  const session = await getServerSession(authOptions)
  const isAuthorized = secret === process.env.CRON_SECRET || session?.user.role === "ADMIN"
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 })
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  if (!appUrl || appUrl.includes("localhost")) {
    return NextResponse.json({ error: "APP_URL not set" }, { status: 500 })
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
