import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/upload"

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

  return NextResponse.json(payment, { status: 201 })
}
