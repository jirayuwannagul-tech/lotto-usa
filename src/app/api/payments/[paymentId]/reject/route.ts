import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cancelCommissionForOrder, ensureReferralTables } from "@/lib/referrals"
import { sendPaymentRejectedEmail } from "@/lib/email"
import { writeAuditLog } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  const { paymentId } = await params
  const { rejectNote } = await req.json().catch(() => ({}))

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectNote },
    include: {
      order: { include: { user: true } },
    },
  })

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: "REJECTED" },
  })

  await cancelCommissionForOrder(payment.orderId)

  // Refund wallet if customer paid via wallet
  if (payment.method === "WALLET" && payment.slipAmount !== null) {
    const refundAmount = Number(payment.slipAmount)
    const updatedUser = await prisma.user.update({
      where: { id: payment.order.user.id },
      data: { walletBalance: { increment: refundAmount } },
    })
    await prisma.walletTransaction.create({
      data: {
        userId: payment.order.user.id,
        type: "REFUND",
        amount: refundAmount,
        balanceAfter: updatedUser.walletBalance,
        note: `คืนเงิน — ออเดอร์ถูกปฏิเสธ`,
      },
    })
  }

  await writeAuditLog({
    adminId: session.user.id,
    action: "PAYMENT_REJECTED",
    targetId: payment.orderId,
    targetType: "Order",
    note: rejectNote,
  })

  sendPaymentRejectedEmail({
    to: payment.order.user.email ?? "",
    name: payment.order.user.name,
    orderId: payment.orderId,
    rejectNote,
  }).catch((err) => console.error("[email] payment rejected failed", err))

  return NextResponse.json({ success: true })
}
