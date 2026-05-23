import { sendRealtimeMessage, sendAdminMessage } from "@/lib/telegram"

function esc(text: string) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")
}

export async function sendOrderConfirmationEmail(params: {
  to: string
  name: string
  orderId: string
  drawType: string
  items: { mainNumbers: string; specialNumber: string }[]
  totalTHB: number
  totalUSD: number
}) {
  const drawLabel = params.drawType === "POWERBALL" ? "Powerball" : "Mega Millions"
  const lines = params.items
    .map((item, i) => `  ${i + 1}\\. ${esc(item.mainNumbers.replace(/,/g, " \\- "))} \\| ${esc(item.specialNumber)}`)
    .join("\n")

  await sendRealtimeMessage(
    `🛒 *ออเดอร์ใหม่ — ${esc(drawLabel)}*\n` +
    `👤 ${esc(params.name)} \\(${esc(params.to)}\\)\n` +
    `🆔 \\#${esc(params.orderId.slice(-8).toUpperCase())}\n` +
    `🎟 ${params.items.length} ชุด\n${lines}\n` +
    `💰 ${esc(params.totalTHB.toLocaleString("th-TH"))} บาท \\(≈ \\$${esc(params.totalUSD.toFixed(2))}\\)`,
  )
}

export async function sendPaymentApprovedEmail(params: {
  to: string
  name: string
  orderId: string
  drawType: string
  drawDate: Date
  items: { mainNumbers: string; specialNumber: string }[]
  totalTHB: number
}) {
  const drawLabel = params.drawType === "POWERBALL" ? "Powerball" : "Mega Millions"
  const drawDateStr = esc(
    params.drawDate.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
  )
  const lines = params.items
    .map((item, i) => `  ${i + 1}\\. ${esc(item.mainNumbers.replace(/,/g, " \\- "))} \\| ${esc(item.specialNumber)}`)
    .join("\n")

  await sendRealtimeMessage(
    `✅ *ชำระเงินสำเร็จ — ${esc(drawLabel)}*\n` +
    `👤 ${esc(params.name)} \\(${esc(params.to)}\\)\n` +
    `🆔 \\#${esc(params.orderId.slice(-8).toUpperCase())}\n` +
    `📅 งวด ${drawDateStr}\n${lines}\n` +
    `💰 ${esc(params.totalTHB.toLocaleString("th-TH"))} บาท`,
  )
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
    `👤 ${esc(params.name)} \\(${esc(params.to)}\\)\n` +
    `🆔 \\#${esc(params.orderId.slice(-8).toUpperCase())}${note}`,
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
  const drawDateStr = esc(
    params.drawDate.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
  )

  await sendAdminMessage(
    `🎉 *คนถูกรางวัล\\! — ${esc(drawLabel)}*\n` +
    `👤 ${esc(params.name)} \\(${esc(params.to)}\\)\n` +
    `📅 งวด ${drawDateStr}\n` +
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
    `👤 ${esc(params.name)} \\(${esc(params.to)}\\)\n` +
    `🔗 ${esc(params.resetUrl)}`,
  )
}
