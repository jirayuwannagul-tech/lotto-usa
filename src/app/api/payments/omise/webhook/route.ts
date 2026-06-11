import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyOmiseWebhook } from "@/lib/omise"
import { approveCommissionForOrder, ensureReferralTables } from "@/lib/referrals"
import { sendPaymentApprovedEmail } from "@/lib/email"
import { sendAdminMessage } from "@/lib/telegram"
import { writeAuditLog } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-omise-signature") ?? ""

  if (!verifyOmiseWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as {
    key: string
    data: { id: string; status: string; metadata?: { orderId?: string } }
  }

  if (event.key !== "charge.complete") {
    return NextResponse.json({ ok: true })
  }

  const charge = event.data
  if (charge.status !== "successful") {
    return NextResponse.json({ ok: true })
  }

  const orderId = charge.metadata?.orderId
  if (!orderId) {
    return NextResponse.json({ error: "No orderId in metadata" }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, draw: true, items: true, payment: true },
  })

  if (!order || order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ ok: true })
  }

  await ensureReferralTables()

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId },
      data: { status: "APPROVED", approvedAt: new Date(), approvedBy: "omise_webhook" },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    }),
  ])

  await approveCommissionForOrder(orderId)

  await writeAuditLog({
    adminId: "omise_webhook",
    action: "PAYMENT_APPROVED",
    targetId: orderId,
    targetType: "Order",
    note: `Omise charge ${charge.id}`,
  })

  const drawLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const itemLines = order.items
    .map((item, i) => `  ${i + 1}. ${item.mainNumbers} | ${item.specialNumber}`)
    .join("\n")

  await sendAdminMessage(
    `✅ Omise ยืนยันชำระแล้ว\n\n👤 ${order.user.name}\n🎱 ${drawLabel}\n🎫 ${order.items.length} ชุด\n💰 ${order.totalTHB} ฿\n\nเลข:\n${itemLines}`,
  ).catch(console.error)

  try {
    await sendPaymentApprovedEmail({
      to: order.user.email ?? "",
      name: order.user.name,
      orderId: order.id,
      drawType: order.draw.type,
      drawDate: order.draw.drawDate,
      items: order.items.map((i) => ({
        mainNumbers: i.mainNumbers,
        specialNumber: i.specialNumber,
      })),
      totalTHB: Number(order.totalTHB),
    })
  } catch (err) {
    console.error("[webhook] email failed", err)
  }

  return NextResponse.json({ ok: true })
}
