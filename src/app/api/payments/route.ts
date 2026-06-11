import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/upload"
import { sendApprovalRequest, sendRealtimeMessage } from "@/lib/telegram"
import { readSlipFromBuffer } from "@/lib/ocr"

function logTelegramError(scope: string, error: unknown) {
  console.error(`[telegram:${scope}]`, error)
}

const escapeMd = (s: string) => s.replace(/[_*`[\]]/g, "\\$&")

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const orderId = formData.get("orderId") as string
    const file = formData.get("slip") as File | null

    if (!orderId || !file) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    })
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 })
    }
    if (order.payment) {
      return NextResponse.json({ error: "ออเดอร์นี้มีสลิปแล้ว" }, { status: 409 })
    }
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "ออเดอร์นี้ไม่สามารถอัปโหลดสลิปได้แล้ว" }, { status: 400 })
    }

    const { assetPath: slipUrl } = await saveUploadedFile(file, "slips")

    // OCR the slip to extract sender name and amount
    const buffer = Buffer.from(await file.arrayBuffer())
    const ocrResult = await readSlipFromBuffer(buffer, file.type || "image/jpeg")

    const orderTotal = Number(order.totalTHB)
    let slipAmountMatches: boolean | null = null
    if (ocrResult.amount !== null) {
      // Allow ±2 baht tolerance for rounding
      slipAmountMatches = Math.abs(ocrResult.amount - orderTotal) <= 2
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        slipUrl,
        slipSenderName: ocrResult.senderName,
        slipAmount: ocrResult.amount !== null ? ocrResult.amount : undefined,
        slipAmountMatches,
        slipOcrNote: ocrResult.raw ? ocrResult.raw.slice(0, 500) : undefined,
      },
    })

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PENDING_APPROVAL" },
    })

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, draw: true, items: true },
    })
    if (fullOrder) {
      const drawLabel = fullOrder.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
      const adminOrdersUrl = `${process.env.NEXTAUTH_URL ?? ""}/admin/orders`

      const verifyLine =
        ocrResult.amount !== null
          ? slipAmountMatches
            ? `✅ ยอดสลิป ${ocrResult.amount.toLocaleString("th-TH")} ฿ — *ตรงกับออเดอร์*`
            : `⚠️ ยอดสลิป ${ocrResult.amount.toLocaleString("th-TH")} ฿ — *ไม่ตรง* (ออเดอร์ ${orderTotal.toLocaleString("th-TH")} ฿)`
          : `❓ OCR ไม่พบยอดเงิน`

      const senderLine = ocrResult.senderName ? `👤 ผู้โอน: ${escapeMd(ocrResult.senderName)}` : ""

      const approvalText =
        `📎 *มีออเดอร์รอกดอนุมัติ*\n\n` +
        `👤 ${escapeMd(fullOrder.user.name)}\n` +
        `🎱 ${drawLabel}\n` +
        `🎫 ${fullOrder.items.length} ชุด\n` +
        `💰 ${orderTotal.toLocaleString("th-TH")} ฿\n` +
        (senderLine ? senderLine + "\n" : "") +
        verifyLine + "\n" +
        `\n🔗 ${adminOrdersUrl}`

      try {
        await Promise.all([
          sendRealtimeMessage(approvalText),
          sendApprovalRequest(orderId, approvalText),
        ])
      } catch (error) {
        logTelegramError("payment-uploaded", error)
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
