import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage, sendApprovalMessage, sendRealtimeMessage } from "@/lib/telegram"
import { approveCommissionForOrder, ensureReferralTables } from "@/lib/referrals"

function logTelegramError(scope: string, error: unknown) {
  console.error(`[telegram:${scope}]`, error)
}

async function tryDelivery(label: string, send: () => Promise<void>) {
  try {
    await send()
    return { ok: true as const, label }
  } catch (error) {
    logTelegramError(label, error)
    return {
      ok: false as const,
      label,
      error: error instanceof Error ? error.message : "Unknown Telegram error",
    }
  }
}

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  const { paymentId } = await params

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy: session.user.id },
    include: {
      order: {
        include: {
          user: true,
          draw: true,
          items: true,
        },
      },
    },
  })

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: "APPROVED" },
  })

  await approveCommissionForOrder(payment.orderId)

  // Send the confirmed numbers only after payment is approved.
  const { order } = payment
  const drawTypeLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const itemLines = order.items
    .map((item, i) => `  ${i + 1}. ${item.mainNumbers} | ${item.specialNumber}`)
    .join("\n")

  const message = `
✅ ยืนยันชำระเงินแล้ว

ส่งเลขเข้ากลุ่มซื้อได้เลย

👤 ${order.user.name}
📞 ${order.user.phone ?? "-"}
🎱 ${drawTypeLabel}
📅 งวด: ${order.draw.drawDate.toLocaleDateString("th-TH")}

เลขที่จอง:
${itemLines}

💰 $${order.totalUSD} = ${order.totalTHB} บาท
อัตรา: $1 = ${order.rateUsed} บาท`

  const deliveries = await Promise.all([
    tryDelivery("admin", () => sendAdminMessage(message)),
    tryDelivery("approval", () => sendApprovalMessage(message)),
    tryDelivery("realtime", () => sendRealtimeMessage(message)),
  ])

  const failed = deliveries.filter((delivery) => !delivery.ok)

  return NextResponse.json({
    success: true,
    telegram: {
      ok: failed.length === 0,
      deliveries,
      failed,
    },
  })
}
