import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== "RESET_LOTTO_NOW_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  await prisma.auditLog.deleteMany()
  await prisma.commission.deleteMany()
  await prisma.userReferral.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.referrerProfile.deleteMany()
  await prisma.user.deleteMany()

  return NextResponse.json({ ok: true, message: "All data deleted" })
}
