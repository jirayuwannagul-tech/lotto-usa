import { Resend } from "resend"
import { sendRealtimeMessage, sendAdminMessage } from "@/lib/telegram"

function esc(text: string) {
  return text.replace(/[_*[\]`]/g, "\\$&")
}

function escHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
    year: "numeric", month: "long", day: "numeric",
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
}): Promise<boolean> {
  sendAdminMessage(
    `🔑 *ขอรีเซ็ตรหัสผ่าน*\n` +
    `👤 ${esc(params.name)}\n` +
    `🔗 ${params.resetUrl}`,
  ).catch((err) => console.error("[email] forgot-password admin notify failed", err))

  if (!resend || !params.to) {
    console.error("[email] RESEND_API_KEY not set or recipient missing — cannot send password reset email")
    return false
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "LottoUSA <onboarding@resend.dev>",
      to: params.to,
      subject: "รีเซ็ตรหัสผ่าน LottoUSA",
      html: [
        `<p>สวัสดีคุณ ${escHtml(params.name)},</p>`,
        `<p>กดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 1 ชั่วโมง):</p>`,
        `<p><a href="${escHtml(params.resetUrl)}">${escHtml(params.resetUrl)}</a></p>`,
        `<p>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>`,
      ].join(""),
    })
    return true
  } catch (err) {
    console.error("[email] sendPasswordResetEmail via Resend failed", err)
    return false
  }
}
