import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"
import { createCommissionForOrder, approveCommissionForOrder } from "@/lib/referrals"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const orderId = typeof body?.orderId === "string" ? body.orderId : null
  if (!orderId) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, user: true, draw: true, items: true },
  })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 })
  }
  if (order.payment) {
    return NextResponse.json({ error: "ออเดอร์นี้มีการชำระเงินแล้ว" }, { status: 409 })
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "ออเดอร์นี้ไม่สามารถชำระเงินได้แล้ว" }, { status: 400 })
  }

  const orderTotal = Number(order.totalTHB)

  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      const blocked = await tx.payment.findUnique({ where: { orderId } })
      if (blocked) {
        throw new Error("ALREADY_PAID")
      }
      const { count } = await tx.user.updateMany({
        where: { id: session.user.id, walletBalance: { gte: orderTotal } },
        data: { walletBalance: { decrement: orderTotal } },
      })
      if (count === 0) {
        throw new Error("INSUFFICIENT_BALANCE")
      }
      const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } })
      await tx.walletTransaction.create({
        data: {
          userId: session.user.id,
          type: "PAYMENT",
          amount: -orderTotal,
          balanceAfter: updatedUser.walletBalance,
          note: `ชำระออเดอร์ #${String(order.orderNumber).padStart(4, "0")}`,
        },
      })
      const payment = await tx.payment.create({
        data: {
          orderId,
          slipUrl: "",
          method: "WALLET",
          status: "APPROVED",
          approvedAt: new Date(),
          slipAmountMatches: true,
          slipAmount: orderTotal,
          slipSenderName: order.user.name,
          slipOcrNote: "Wallet payment — auto-approved",
        },
      })
      await tx.order.update({
        where: { id: orderId },
        data: { status: "APPROVED" },
      })
      return { payment, balance: updatedUser.walletBalance }
    })
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "ยอดเงินในกระเป๋าไม่เพียงพอ" }, { status: 400 })
    }
    if (err instanceof Error && err.message === "ALREADY_PAID") {
      return NextResponse.json({ error: "ออเดอร์นี้มีการชำระเงินแล้ว" }, { status: 409 })
    }
    throw err
  }

  // Commission: create then immediately approve (same as slip+approve flow)
  await createCommissionForOrder({
    orderId,
    referredUserId: session.user.id,
    itemCount: order.items.length,
    rateUsed: Number(order.rateUsed),
    drawType: order.draw.type,
  })
  await approveCommissionForOrder(orderId)

  const drawLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const notifyText =
    `💳 *ชำระด้วย Wallet — อนุมัติอัตโนมัติ*\n\n` +
    `👤 ${order.user.name}\n` +
    `${drawLabel}  |  ${order.items.length} ใบ\n` +
    `💰 ${orderTotal.toLocaleString("th-TH")} ฿`

  sendAdminMessage(notifyText).catch((err) => console.error("[telegram:wallet-payment]", err))

  return NextResponse.json({ ok: true, balance: result.balance }, { status: 201 })
}
