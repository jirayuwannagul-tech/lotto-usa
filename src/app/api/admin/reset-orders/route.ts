import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables } from "@/lib/referrals"

type ResetOrdersBody = {
  confirm?: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureReferralTables()

  let body: ResetOrdersBody
  try {
    body = (await req.json()) as ResetOrdersBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.confirm !== "RESET_ORDERS") {
    return NextResponse.json(
      { error: "Confirmation token mismatch. Send {\"confirm\":\"RESET_ORDERS\"}." },
      { status: 400 }
    )
  }

  const [ordersBefore, paymentsBefore, itemsBefore, commissionsBefore] = await prisma.$transaction([
    prisma.order.count(),
    prisma.payment.count(),
    prisma.orderItem.count(),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "Commission"`,
  ])

  await prisma.$transaction([
    prisma.$executeRaw`DELETE FROM "Commission"`,
    prisma.payment.deleteMany({}),
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
  ])

  return NextResponse.json({
    ok: true,
    deleted: {
      orders: ordersBefore,
      payments: paymentsBefore,
      items: itemsBefore,
      commissions: Number(commissionsBefore[0]?.count ?? 0),
    },
  })
}
