import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/upload"
import { sendAdminMessage } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const orderId = formData.get("orderId") as string
  const file = formData.get("slip") as File | null

  if (!orderId || !file) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 })
  }

  const slipUrl = await saveUploadedFile(file, "slips")

  const payment = await prisma.payment.create({
    data: { orderId, slipUrl },
  })

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "PENDING_APPROVAL" },
  })

  // Notify admin via Telegram
  const fullOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, draw: true, items: true },
  })
  if (fullOrder) {
    const drawLabel = fullOrder.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const itemLines = fullOrder.items.map((item, i) => `  ${i + 1}. ${item.mainNumbers} | ${item.specialNumber}`).join("\n")
    await sendAdminMessage(
      `📎 *สลิปใหม่ — รอตรวจสอบ*\n\n👤 ${fullOrder.user.name}\n🎱 ${drawLabel}\n\nเลขที่จอง:\n${itemLines}\n\n💰 ${Number(fullOrder.totalTHB).toFixed(0)} ฿\n🔗 ดูสลิป: ${slipUrl}`
    )
  }

  return NextResponse.json(payment, { status: 201 })
}
