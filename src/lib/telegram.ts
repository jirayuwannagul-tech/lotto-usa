const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ""
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`
const FILE_BASE = `https://api.telegram.org/file/bot${BOT_TOKEN}`

// ---- Send ----------------------------------------------------------------

export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: "Markdown" | "HTML" | "MarkdownV2" = "Markdown"
) {
  await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })
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
  // ถ้าไม่ได้ set → ให้ทุก chat ใช้ได้ (ตั้งค่าก่อน deploy)
  if (!allowed) return true
  return allowed.split(",").map((s) => s.trim()).includes(String(chatId))
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
