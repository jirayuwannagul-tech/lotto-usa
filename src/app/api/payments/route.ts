import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/upload"
import { sendApprovalMessage, sendRealtimeMessage } from "@/lib/telegram"

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

    const payment = await prisma.payment.create({
      data: { orderId, slipUrl },
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
      const adminOrdersUrl = new URL("/admin/orders", req.url).toString()
      const approvalText =
        `📎 *มีออเดอร์รอกดอนุมัติ*\n\n👤 ${fullOrder.user.name}\n🎱 ${drawLabel}\n🎫 ${fullOrder.items.length} ชุด\n💰 ${Number(fullOrder.totalTHB).toFixed(0)} ฿\n\n🔗 ${adminOrdersUrl}`

      await Promise.all([
        sendRealtimeMessage(approvalText),
        sendApprovalMessage(approvalText),
      ])
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
