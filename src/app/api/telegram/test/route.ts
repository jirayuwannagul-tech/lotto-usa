import { NextRequest, NextResponse } from "next/server"
import { sendAdminMessage } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS

  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN ไม่ได้ตั้งค่า" })
  if (!chatIds) return NextResponse.json({ ok: false, error: "TELEGRAM_ADMIN_CHAT_IDS ไม่ได้ตั้งค่า" })

  try {
    await sendAdminMessage("✅ *ทดสอบระบบ LottoUSA*\n\nการแจ้งเตือน Telegram ทำงานปกติแล้ว 🎉")
    return NextResponse.json({ ok: true, sentTo: chatIds })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
