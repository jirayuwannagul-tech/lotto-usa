import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "APPROVED"

  const commissions = await prisma.commission.findMany({
    where: { status: status as never },
    include: {
      order: { include: { draw: true } },
      referrer: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by referrer
  const grouped: Record<string, {
    referrerId: string
    referrerName: string
    referrerEmail: string
    referrerPhone: string | null
    totalAmountTHB: number
    commissions: typeof commissions
  }> = {}

  for (const c of commissions) {
    const uid = c.referrerUserId
    if (!grouped[uid]) {
      grouped[uid] = {
        referrerId: uid,
        referrerName: c.referrer.user.name,
        referrerEmail: c.referrer.user.email ?? "",
        referrerPhone: c.referrer.user.phone,
        totalAmountTHB: 0,
        commissions: [],
      }
    }
    grouped[uid].totalAmountTHB += Number(c.amountTHB)
    grouped[uid].commissions.push(c)
  }

  return NextResponse.json(Object.values(grouped))
}
