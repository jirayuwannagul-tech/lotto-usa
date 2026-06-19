import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendRealtimeMessage, buildApprovedMessage } from "@/lib/telegram"
import { createCommissionForOrder, approveCommissionForOrder, ensureReferralTables } from "@/lib/referrals"
import { writeAuditLog } from "@/lib/audit"

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  const { paymentId } = await params

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!existing) return NextResponse.json({ error: "ไม่พบ payment" }, { status: 404 })
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "payment นี้ถูกดำเนินการไปแล้ว" }, { status: 409 })
  }

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: session.user.id },
    include: {
      order: {
        include: { user: true, draw: true, items: true },
      },
    },
  })

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: "APPROVED" },
  })

  await createCommissionForOrder({
    orderId: payment.orderId,
    referredUserId: payment.order.userId,
    itemCount: payment.order.items.length,
    rateUsed: Number(payment.order.rateUsed),
    drawType: payment.order.draw.type,
  })
  await approveCommissionForOrder(payment.orderId)

  const { order } = payment
  const message = buildApprovedMessage({
    userName: order.user.name,
    userPhone: order.user.phone,
    drawType: order.draw.type,
    drawDate: order.draw.drawDate,
    itemCount: order.items.length,
    totalTHB: Number(order.totalTHB),
    totalUSD: Number(order.totalUSD),
    rateUsed: Number(order.rateUsed),
    items: order.items.map((i) => ({ mainNumbers: i.mainNumbers, specialNumber: i.specialNumber })),
  })

  try {
    await sendRealtimeMessage(message)
  } catch (err) {
    console.error("[telegram:approve]", err)
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "PAYMENT_APPROVED",
    targetId: payment.orderId,
    targetType: "Order",
    note: `Payment ${paymentId}`,
  })

  return NextResponse.json({ success: true })
}
