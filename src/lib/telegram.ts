const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`
const FILE_BASE = `https://api.telegram.org/file/bot${BOT_TOKEN}`

function getChatIds(envKey: string) {
  const scoped = process.env[envKey]
  const fallback = process.env.TELEGRAM_ADMIN_CHAT_IDS
  const raw = scoped || fallback || ""
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function getThreadId(envKey: string) {
  const raw = process.env[envKey]
  if (!raw) return undefined
  const value = Number(raw)
  // topic 1 = General — Telegram rejects message_thread_id=1, send without it
  if (!Number.isFinite(value) || value === 1) return undefined
  return value
}

// ---- Send ----------------------------------------------------------------

export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: "Markdown" | "HTML" | "MarkdownV2" = "Markdown",
  messageThreadId?: number
) {
  const res = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
    }),
  })

  const data = await res.json().catch(() => null) as
    | { ok?: boolean; description?: string }
    | null

  if (!res.ok || !data?.ok) {
    const detail = data?.description || `HTTP ${res.status}`
    throw new Error(`Telegram sendMessage failed for chat ${chatId}: ${detail}`)
  }
}

export async function sendMessageWithButtons(
  chatId: number | string,
  text: string,
  buttons: { text: string; callback_data: string }[][],
  parseMode: "Markdown" | "HTML" | "MarkdownV2" = "Markdown",
  messageThreadId?: number
) {
  const res = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      reply_markup: { inline_keyboard: buttons },
      ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
    }),
  })
  const data = await res.json().catch(() => null) as { ok?: boolean; description?: string } | null
  if (!res.ok || !data?.ok) {
    throw new Error(`Telegram sendMessageWithButtons failed for chat ${chatId}: ${data?.description || `HTTP ${res.status}`}`)
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  parseMode: "Markdown" | "HTML" | "MarkdownV2" = "Markdown"
) {
  await fetch(`${BASE}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: parseMode }),
  })
}

export async function sendApprovalRequest(orderId: string, text: string) {
  const ids = getChatIds("TELEGRAM_APPROVAL_CHAT_IDS")
  const threadId = getThreadId("TELEGRAM_APPROVAL_THREAD_ID")
  if (ids.length === 0 || !BOT_TOKEN) return
  const buttons = [[
    { text: "✅ อนุมัติ", callback_data: `bought:${orderId}` },
    { text: "❌ ยกเลิก", callback_data: `cancel:${orderId}` },
  ]]
  await Promise.all(ids.map((id) => sendMessageWithButtons(id, text, buttons, "Markdown", threadId)))
}

// ---- File ----------------------------------------------------------------

export async function getFilePath(fileId: string): Promise<string | null> {
  const res = await fetch(`${BASE}/getFile?file_id=${fileId}`)
  const data = await res.json()
  if (!data.ok) return null
  return data.result.file_path as string
}

export async function downloadFileBuffer(fileId: string): Promise<Buffer | null> {
  const filePath = await getFilePath(fileId)
  if (!filePath) return null
  const res = await fetch(`${FILE_BASE}/${filePath}`)
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

// ---- Security ------------------------------------------------------------

export function isAllowedChat(chatId: number): boolean {
  const allowed = process.env.TELEGRAM_ADMIN_CHAT_IDS
  if (!allowed) return false
  return allowed.split(",").map((s) => s.trim()).includes(String(chatId))
}

// ---- Admin broadcast -----------------------------------------------------

export async function sendAdminMessage(text: string) {
  const ids = getChatIds("TELEGRAM_ADMIN_CHAT_IDS")
  const threadId = getThreadId("TELEGRAM_ADMIN_THREAD_ID")
  if (ids.length === 0 || !BOT_TOKEN) return
  await Promise.all(ids.map((id) => sendMessage(id, text, "Markdown", threadId)))
}

export async function sendRealtimeMessage(text: string) {
  const ids = getChatIds("TELEGRAM_REALTIME_CHAT_IDS")
  const threadId = getThreadId("TELEGRAM_REALTIME_THREAD_ID")
  if (ids.length === 0 || !BOT_TOKEN) return
  await Promise.all(ids.map((id) => sendMessage(id, text, "Markdown", threadId)))
}

export async function sendDailySummaryMessage(text: string) {
  const ids = getChatIds("TELEGRAM_DAILY_SUMMARY_CHAT_IDS")
  const threadId = getThreadId("TELEGRAM_DAILY_SUMMARY_THREAD_ID")
  if (ids.length === 0 || !BOT_TOKEN) return
  await Promise.all(ids.map((id) => sendMessage(id, text, "Markdown", threadId)))
}

export async function sendApprovalMessage(text: string) {
  const ids = getChatIds("TELEGRAM_APPROVAL_CHAT_IDS")
  const threadId = getThreadId("TELEGRAM_APPROVAL_THREAD_ID")
  if (ids.length === 0 || !BOT_TOKEN) return
  await Promise.all(ids.map((id) => sendMessage(id, text, "Markdown", threadId)))
}

// ---- Message helpers -----------------------------------------------------

export function formatLotteryNumbers(
  items: { mainNumbers: string; specialNumber: string }[],
  drawType: string
): string {
  const specialLabel = drawType === "POWERBALL" ? "PB" : "MB"
  return items
    .map((item, i) => {
      const mains = item.mainNumbers
        .split(",")
        .map((n) => n.padStart(2, "0"))
        .join("  ")
      const special = item.specialNumber.padStart(2, "0")
      return `\`${String(i + 1).padStart(2)}. ${mains}  │ ${specialLabel} ${special}\``
    })
    .join("\n")
}

export function buildApprovalMessage(params: {
  userName: string
  userPhone: string | null
  drawType: string
  drawDate: Date
  itemCount: number
  totalTHB: number
  totalUSD: number
  rateUsed: number
  items: { mainNumbers: string; specialNumber: string }[]
  slipVerify?: string
  adminUrl?: string
}): string {
  const drawLabel = params.drawType === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const drawDateStr = params.drawDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
  const esc = (s: string) => s.replace(/[_*`[\]]/g, "\\$&")

  const lines = [
    `📎 *มีออเดอร์รอกดอนุมัติ*`,
    ``,
    `👤 ${esc(params.userName)}${params.userPhone ? `  📞 ${params.userPhone}` : ""}`,
    `${drawLabel}  |  งวด ${drawDateStr}  |  ${params.itemCount} ใบ`,
    `💰 ${params.totalTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿  ($${params.totalUSD.toFixed(2)})`,
  ]

  if (params.slipVerify) lines.push(params.slipVerify)

  lines.push(``, `🎫 *เลขที่จอง:*`)
  lines.push(formatLotteryNumbers(params.items, params.drawType))

  if (params.adminUrl) lines.push(``, `🔗 ${params.adminUrl}`)

  return lines.join("\n")
}

export function buildApprovedMessage(params: {
  userName: string
  userPhone: string | null
  drawType: string
  drawDate: Date
  itemCount: number
  totalTHB: number
  totalUSD: number
  rateUsed: number
  items: { mainNumbers: string; specialNumber: string }[]
}): string {
  const drawLabel = params.drawType === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const drawDateStr = params.drawDate.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
  const esc = (s: string) => s.replace(/[_*`[\]]/g, "\\$&")

  const lines = [
    `✅ *อนุมัติแล้ว — ซื้อเลขได้เลย*`,
    ``,
    `👤 ${esc(params.userName)}${params.userPhone ? `  📞 ${params.userPhone}` : ""}`,
    `${drawLabel}  |  งวด ${drawDateStr}  |  ${params.itemCount} ใบ`,
    `💰 $${params.totalUSD.toFixed(2)} = ${params.totalTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿  (rate $1 = ${Number(params.rateUsed).toFixed(0)} ฿)`,
    ``,
    `🎟 *เลขที่ต้องซื้อ:*`,
    formatLotteryNumbers(params.items, params.drawType),
  ]

  return lines.join("\n")
}

// ---- Types ---------------------------------------------------------------

export interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: TgCallbackQuery
}

export interface TgCallbackQuery {
  id: string
  from: { id: number; first_name: string; username?: string }
  message?: TgMessage
  data?: string
}

export interface TgMessage {
  message_id: number
  from?: { id: number; first_name: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  photo?: TgPhotoSize[]
  document?: TgDocument
  caption?: string
}

export interface TgPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TgDocument {
  file_id: string
  file_name?: string
  mime_type?: string
}
