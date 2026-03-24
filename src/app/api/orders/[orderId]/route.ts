import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orderId } = await params
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, phone: true, lineId: true } },
      draw: true,
      items: true,
      payment: true,
    },
  })

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (session.user.role !== "ADMIN" && order.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(order)
}
