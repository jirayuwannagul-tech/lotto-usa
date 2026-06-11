import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { referrerId, note } = await req.json().catch(() => ({}))

  if (!referrerId) {
    return NextResponse.json({ error: "ไม่พบ referrerId" }, { status: 400 })
  }

  const result = await prisma.commission.updateMany({
    where: { referrerUserId: referrerId, status: "APPROVED" },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidBy: session.user.id,
      paidNote: note,
    },
  })

  await writeAuditLog({
    adminId: session.user.id,
    action: "COMMISSION_PAID",
    targetId: referrerId,
    targetType: "User",
    note: `Paid ${result.count} commissions. ${note ?? ""}`,
  })

  return NextResponse.json({ count: result.count })
}
