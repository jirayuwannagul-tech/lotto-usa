import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { paymentId } = await params
  const { rejectNote } = await req.json()

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectNote },
  })

  await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { orderId: true },
  }).then((p) => {
    if (p) {
      return prisma.order.update({
        where: { id: p.orderId },
        data: { status: "REJECTED" },
      })
    }
  })

  return NextResponse.json({ success: true })
}
