import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM ?? "Lotto USA <noreply@lottousathai.com>"

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
  const itemsHtml = params.items
    .map(
      (item, i) =>
        `<tr><td style="padding:8px 0;color:#475569">${i + 1}.</td><td style="padding:8px 0;font-family:monospace;font-size:16px;font-weight:600;color:#0f172a">${item.mainNumbers.replace(/,/g, " - ")} &bull; ${item.specialNumber}</td></tr>`,
    )
    .join("")

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `ยืนยันออเดอร์ ${drawLabel} — ${params.items.length} ชุด`,
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f172a;padding:32px 40px">
      <p style="margin:0;color:#94a3b8;font-size:13px">Lotto USA</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:700">ยืนยันออเดอร์แล้ว ✅</h1>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 24px;color:#475569">สวัสดีคุณ ${params.name},</p>
      <p style="margin:0 0 24px;color:#475569">เราได้รับออเดอร์ <strong>${drawLabel}</strong> ของคุณเรียบร้อยแล้ว กรุณาชำระเงินภายใน 30 นาที</p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;padding:16px 20px;display:block">
        ${itemsHtml}
      </table>
      <div style="margin:24px 0;padding:16px 20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0">
        <p style="margin:0;font-size:13px;color:#15803d">รหัสออเดอร์: <strong>#${params.orderId.slice(-8).toUpperCase()}</strong></p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#0f172a">${params.totalTHB.toLocaleString("th-TH")} บาท</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b">(≈ $${params.totalUSD.toFixed(2)})</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/payment?orderId=${params.orderId}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">ไปหน้าชำระเงิน →</a>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 Lotto USA · ไม่ต้องการรับอีเมลนี้? ติดต่อเราที่ support</p>
    </div>
  </div>
</body>
</html>`,
  })
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
  const drawDateStr = params.drawDate.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const itemsHtml = params.items
    .map(
      (item, i) =>
        `<p style="margin:6px 0;font-family:monospace;font-size:16px;font-weight:600;color:#0f172a">${i + 1}. ${item.mainNumbers.replace(/,/g, " - ")} &bull; ${item.specialNumber}</p>`,
    )
    .join("")

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `ชำระเงินสำเร็จ — ${drawLabel} ${drawDateStr}`,
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#15803d;padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">ชำระเงินสำเร็จ ✅</h1>
      <p style="margin:8px 0 0;color:#bbf7d0">เลขของคุณเข้าระบบแล้ว รอลุ้น!</p>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 16px;color:#475569">สวัสดีคุณ <strong>${params.name}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569">การชำระเงินได้รับการยืนยันแล้ว เลขของคุณสำหรับ <strong>${drawLabel}</strong> งวดวันที่ <strong>${drawDateStr}</strong></p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px">
        ${itemsHtml}
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#64748b">ยอดชำระ: <strong>${params.totalTHB.toLocaleString("th-TH")} บาท</strong></p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 Lotto USA</p>
    </div>
  </div>
</body>
</html>`,
  })
}

export async function sendPaymentRejectedEmail(params: {
  to: string
  name: string
  orderId: string
  rejectNote?: string
}) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "สลิปถูกปฏิเสธ — กรุณาอัปโหลดใหม่",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#b91c1c;padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">สลิปถูกปฏิเสธ ❌</h1>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 16px;color:#475569">สวัสดีคุณ <strong>${params.name}</strong>,</p>
      <p style="margin:0 0 16px;color:#475569">สลิปที่อัปโหลดมาไม่ผ่านการตรวจสอบ</p>
      ${params.rejectNote ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px"><p style="margin:0;color:#b91c1c;font-size:14px"><strong>เหตุผล:</strong> ${params.rejectNote}</p></div>` : ""}
      <a href="${process.env.NEXTAUTH_URL}/payment?orderId=${params.orderId}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">อัปโหลดสลิปใหม่ →</a>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 Lotto USA</p>
    </div>
  </div>
</body>
</html>`,
  })
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
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `🎉 คุณถูกรางวัล ${params.prizeLabel}! — ${drawLabel}`,
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center">
      <p style="margin:0;font-size:48px">🎉</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:28px;font-weight:700">คุณถูกรางวัล!</h1>
      <p style="margin:8px 0 0;color:#fef3c7;font-size:18px">${params.prizeLabel}</p>
    </div>
    <div style="padding:32px 40px;text-align:center">
      <p style="margin:0 0 16px;color:#475569">สวัสดีคุณ <strong>${params.name}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569">ยินดีด้วย! คุณถูกรางวัล <strong>${drawLabel}</strong> งวด ${drawDateStr}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#92400e">เลขที่ถูก</p>
        <p style="margin:8px 0 0;font-family:monospace;font-size:20px;font-weight:700;color:#0f172a">${params.matchedNumbers}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#64748b">ทีมงานจะติดต่อกลับเพื่อดำเนินการรับรางวัล</p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 Lotto USA</p>
    </div>
  </div>
</body>
</html>`,
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  name: string
  resetUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "รีเซ็ตรหัสผ่าน Lotto USA",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f172a;padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">รีเซ็ตรหัสผ่าน 🔑</h1>
    </div>
    <div style="padding:32px 40px">
      <p style="margin:0 0 16px;color:#475569">สวัสดีคุณ <strong>${params.name}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569">เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 1 ชั่วโมง)</p>
      <a href="${params.resetUrl}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">ตั้งรหัสผ่านใหม่ →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">ถ้าคุณไม่ได้ขอรีเซ็ต ไม่ต้องทำอะไร</p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 Lotto USA</p>
    </div>
  </div>
</body>
</html>`,
  })
}
