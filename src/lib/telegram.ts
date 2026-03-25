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
  return Number.isFinite(value) ? value : undefined
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

// ---- Types ---------------------------------------------------------------

export interface TgUpdate {
  update_id: number
  message?: TgMessage
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
