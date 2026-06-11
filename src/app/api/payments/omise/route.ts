import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPromptPayCharge } from "@/lib/omise"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orderId } = await req.json().catch(() => ({}))

  if (!orderId) {
    return NextResponse.json({ error: "ไม่พบ orderId" }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { draw: true, items: true, payment: true },
  })

  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 })
  }

  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "ออเดอร์นี้ไม่อยู่ในสถานะรอชำระเงิน" }, { status: 400 })
  }

  const drawLabel = order.draw.type === "POWERBALL" ? "Powerball" : "Mega Millions"
  const amountSatang = Math.round(Number(order.totalTHB) * 100)

  const charge = await createPromptPayCharge({
    amount: amountSatang,
    orderId: order.id,
    description: `Lotto USA ${drawLabel} x${order.items.length} ชุด`,
  })

  if (charge.object === "error") {
    return NextResponse.json({ error: charge.message ?? "Omise error" }, { status: 400 })
  }

  // Store the charge ID in payment record for tracking
  await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      slipUrl: `omise:${charge.id}`,
    },
    update: {
      slipUrl: `omise:${charge.id}`,
    },
  })

  return NextResponse.json({
    chargeId: charge.id,
    status: charge.status,
    qrCode: charge.source?.scannable_code?.image?.download_uri ?? null,
    amount: Number(order.totalTHB),
    expiresAt: charge.expires_at,
  })
}
