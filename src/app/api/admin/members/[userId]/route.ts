import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables, getReferrerByCode } from "@/lib/referrals"
import { writeAuditLog } from "@/lib/audit"

type Params = {
  params: Promise<{
    userId: string
  }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  const code = typeof body?.referralCode === "string" ? body.referralCode.trim().toUpperCase() : ""

  if (!code) return NextResponse.json({ error: "กรุณาระบุรหัสผู้แนะนำ" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 })
  }

  const existing = await prisma.userReferral.findUnique({ where: { userId } })
  if (existing) {
    return NextResponse.json({ error: "สมาชิกนี้มีผู้แนะนำอยู่แล้ว" }, { status: 409 })
  }

  const referrer = await getReferrerByCode(code)
  if (!referrer) {
    return NextResponse.json({ error: `ไม่พบรหัสผู้แนะนำ "${code}"` }, { status: 404 })
  }

  if (referrer.userId === userId) {
    return NextResponse.json({ error: "ไม่สามารถแนะนำตัวเองได้" }, { status: 400 })
  }

  await prisma.userReferral.create({
    data: { userId, referrerUserId: referrer.userId, referralCode: referrer.referralCode },
  })

  await writeAuditLog({
    adminId: session.user.id,
    action: "MEMBER_MADE_REFERRER",
    targetId: userId,
    targetType: "User",
    note: `Admin assigned referrer code ${code} to ${user.name}`,
  })

  return NextResponse.json({ ok: true, referralCode: referrer.referralCode })
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

  await writeAuditLog({
    adminId: session.user.id,
    action: "MEMBER_DELETED",
    targetId: userId,
    targetType: "User",
    note: `Deleted ${user.email}, ${deleted.orders} orders`,
  })

  return NextResponse.json({
    ok: true,
    deleted,
  })
}
