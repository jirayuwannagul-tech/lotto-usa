import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"
import { approveCommissionForOrder, ensureReferralTables } from "@/lib/referrals"

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

  await sendAdminMessage(message)

  return NextResponse.json({ success: true })
}
