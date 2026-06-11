import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

type Params = {
  params: Promise<{ userId: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const body = await req.json().catch(() => null)
  const amount = Number(body?.amount)
  const note = typeof body?.note === "string" ? body.note.trim() : ""

  if (!amount || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } },
    })
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "TOPUP",
        amount,
        balanceAfter: updatedUser.walletBalance,
        note: note || `Admin top-up by ${session.user.name}`,
        createdBy: session.user.id,
      },
    })
    return updatedUser
  })

  await writeAuditLog({
    adminId: session.user.id,
    action: "COMMISSION_PAID",
    targetId: userId,
    targetType: "User",
    note: `Wallet top-up ${amount} ฿ → ${user.email}`,
  })

  return NextResponse.json({ ok: true, balance: updated.walletBalance })
}
