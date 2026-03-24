import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ResetOrdersBody = {
  confirm?: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  const [ordersBefore, paymentsBefore, itemsBefore] = await prisma.$transaction([
    prisma.order.count(),
    prisma.payment.count(),
    prisma.orderItem.count(),
  ])

  await prisma.$transaction([
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
    },
  })
}
