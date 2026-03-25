import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables } from "@/lib/referrals"

type Params = {
  params: Promise<{
    userId: string
  }>
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        select: { id: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Only customer accounts can be deleted here" }, { status: 400 })
  }

  const orderIds = user.orders.map((order) => order.id)

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM "Commission" WHERE "referredUserId" = ${userId} OR "referrerUserId" = ${userId}`
    await tx.$executeRaw`DELETE FROM "UserReferral" WHERE "userId" = ${userId} OR "referrerUserId" = ${userId}`
    await tx.$executeRaw`DELETE FROM "ReferrerProfile" WHERE "userId" = ${userId}`

    const paymentsDeleted = orderIds.length
      ? await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        })
      : { count: 0 }

    const ordersDeleted = orderIds.length
      ? await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        })
      : { count: 0 }

    await tx.user.delete({
      where: { id: userId },
    })

    return {
      payments: paymentsDeleted.count,
      orders: ordersDeleted.count,
      user: user.email,
    }
  })

  return NextResponse.json({
    ok: true,
    deleted,
  })
}
