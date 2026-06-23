import { sendRealtimeMessage, sendAdminMessage } from "@/lib/telegram"

function esc(text: string) {
  return text.replace(/[_*[\]`]/g, "\\$&")
}

// Order confirmation — no TG, order is not yet paid
export async function sendOrderConfirmationEmail(_params: {
  to: string
  name: string
  orderId: string
  drawType: string
  items: { mainNumbers: string; specialNumber: string }[]
  totalTHB: number
  totalUSD: number
}) {
  // TG notification happens only after slip is uploaded, not on order creation
}

// Payment approved — no TG, approve/route.ts sends via buildApprovedMessage
export async function sendPaymentApprovedEmail(_params: {
  to: string
  name: string
  orderId: string
  drawType: string
  drawDate: Date
  items: { mainNumbers: string; specialNumber: string }[]
  totalTHB: number
}) {
  // TG notification is sent by approve/route.ts via sendRealtimeMessage(buildApprovedMessage)
}

export async function sendPaymentRejectedEmail(params: {
  to: string
  name: string
  orderId: string
  rejectNote?: string
}) {
  const note = params.rejectNote ? `\n⚠️ เหตุผล: ${esc(params.rejectNote)}` : ""
  await sendRealtimeMessage(
    `❌ *สลิปถูกปฏิเสธ*\n` +
    `👤 ${esc(params.name)}\n` +
    `🆔 #${params.orderId.slice(-8).toUpperCase()}${note}`,
  )
}

export async function sendWinnerEmail(params: {
  to: string
  name: string
  drawType: string
  drawDate: Date
  prizeLabel: string
  matchedNumbers: string
}) {
  const drawLabel = params.drawType === "POWERBALL" ? "Powerball" : "Mega Millions"
  const drawDateStr = params.drawDate.toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
  })

  await sendAdminMessage(
    `🎉 *คนถูกรางวัล! — ${esc(drawLabel)}*\n` +
    `👤 ${esc(params.name)}\n` +
    `📅 งวด ${esc(drawDateStr)}\n` +
    `🏆 รางวัล: ${esc(params.prizeLabel)}\n` +
    `🔢 เลข: ${esc(params.matchedNumbers)}`,
  )
}

export async function sendPasswordResetEmail(params: {
  to: string
  name: string
  resetUrl: string
}) {
  await sendAdminMessage(
    `🔑 *ขอรีเซ็ตรหัสผ่าน*\n` +
    `👤 ${esc(params.name)}\n` +
    `🔗 ${params.resetUrl}`,
  )
}
