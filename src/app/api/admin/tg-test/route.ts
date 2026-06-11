import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? ""
  const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? ""
  const realtimeChatIds = process.env.TELEGRAM_REALTIME_CHAT_IDS ?? ""

  if (!botToken) {
    return NextResponse.json({
      ok: false,
      error: "TELEGRAM_BOT_TOKEN is not set in environment variables",
      envCheck: { botToken: "MISSING", adminChatIds: adminChatIds || "MISSING", realtimeChatIds: realtimeChatIds || "MISSING" },
    })
  }

  const chatIds = [...new Set([
    ...adminChatIds.split(",").map((s) => s.trim()).filter(Boolean),
    ...realtimeChatIds.split(",").map((s) => s.trim()).filter(Boolean),
  ])]

  if (chatIds.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "No chat IDs configured. Set TELEGRAM_ADMIN_CHAT_IDS or TELEGRAM_REALTIME_CHAT_IDS.",
      envCheck: { botToken: `...${botToken.slice(-8)}`, adminChatIds: adminChatIds || "MISSING", realtimeChatIds: realtimeChatIds || "MISSING" },
    })
  }

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "🧪 ทดสอบ TG — ถ้าเห็นข้อความนี้แสดงว่าระบบแจ้งเตือนทำงานปกติ ✅",
          }),
        })
        const data = await res.json() as { ok?: boolean; description?: string; result?: { message_id: number } }
        return { chatId, ok: data.ok, messageId: data.result?.message_id, error: data.description ?? null }
      } catch (e) {
        return { chatId, ok: false, error: String(e) }
      }
    })
  )

  const allOk = results.every((r) => r.ok)
  return NextResponse.json({
    ok: allOk,
    envCheck: {
      botToken: `...${botToken.slice(-8)}`,
      adminChatIds: adminChatIds || "MISSING",
      realtimeChatIds: realtimeChatIds || "MISSING",
    },
    results,
  })
}
