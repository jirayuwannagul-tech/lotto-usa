import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables } from "@/lib/referrals"

type DeleteOrdersBody = {
  email?: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  let body: DeleteOrdersBody
  try {
    body = (await req.json()) as DeleteOrdersBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      orders: {
        select: { id: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const orderIds = user.orders.map((order) => order.id)
  if (orderIds.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: { email, orders: 0, payments: 0, commissions: 0 },
    })
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const commissionsDeleted = await tx.$executeRaw`
      DELETE FROM "Commission"
      WHERE "orderId" = ANY(${orderIds})
    `

    const paymentsDeleted = await tx.payment.deleteMany({
      where: { orderId: { in: orderIds } },
    })

    const ordersDeleted = await tx.order.deleteMany({
      where: { id: { in: orderIds } },
    })

    return {
      email,
      orders: ordersDeleted.count,
      payments: paymentsDeleted.count,
      commissions: Number(commissionsDeleted),
    }
  })

  return NextResponse.json({
    ok: true,
    deleted,
  })
}
