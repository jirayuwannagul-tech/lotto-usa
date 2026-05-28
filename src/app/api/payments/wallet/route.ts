import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendApprovalMessage, sendRealtimeMessage } from "@/lib/telegram"

function logTelegramError(scope: string, error: unknown) {
  console.error(`[telegram:${scope}]`, error)
}

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
  const userBalance = Number(order.user.walletBalance)
  if (userBalance < orderTotal) {
    return NextResponse.json({ error: "ยอดเงินในกระเป๋าไม่เพียงพอ" }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: session.user.id },
      data: { walletBalance: { decrement: orderTotal } },
    })
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

  const drawLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const notifyText =
    `💳 *ชำระด้วย Wallet*\n\n` +
    `👤 ${order.user.name}\n` +
    `🎱 ${drawLabel}\n` +
    `🎫 ${order.items.length} ชุด\n` +
    `💰 ${orderTotal.toLocaleString("th-TH")} ฿ (อนุมัติอัตโนมัติ)`

  try {
    await Promise.all([
      sendRealtimeMessage(notifyText),
      sendApprovalMessage(notifyText),
    ])
  } catch (error) {
    logTelegramError("wallet-payment", error)
  }

  return NextResponse.json({ ok: true, balance: result.balance }, { status: 201 })
}
