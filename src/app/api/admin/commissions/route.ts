import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MARGIN_USD } from "@/lib/lottery-rules"

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
      order: {
        include: {
          draw: true,
          items: { select: { id: true } },
          user: { select: { id: true, name: true, phone: true } },
        },
      },
      referrer: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const COMMISSION_RATE = 0.5

  const grouped: Record<string, {
    referrerId: string
    referrerName: string
    referrerEmail: string
    referrerPhone: string | null
    referralCode: string
    totalAmountTHB: number
    totalAmountUSD: number
    commissions: {
      id: string
      amountTHB: number
      amountUSD: number
      profitUSD: number
      itemCount: number
      status: string
      createdAt: string
      referredMemberName: string
      referredMemberPhone: string | null
      order: { id: string; draw: { type: string; drawDate: string } }
    }[]
  }> = {}

  for (const c of commissions) {
    const uid = c.referrerUserId
    const itemCount = c.order.items.length
    const profitUSD = MARGIN_USD * itemCount
    const amountUSD = profitUSD * COMMISSION_RATE

    if (!grouped[uid]) {
      grouped[uid] = {
        referrerId: uid,
        referrerName: c.referrer.user.name,
        referrerEmail: c.referrer.user.email ?? "",
        referrerPhone: c.referrer.user.phone,
        referralCode: c.referrer.referralCode,
        totalAmountTHB: 0,
        totalAmountUSD: 0,
        commissions: [],
      }
    }

    grouped[uid].totalAmountTHB += Number(c.amountTHB)
    grouped[uid].totalAmountUSD += amountUSD
    grouped[uid].commissions.push({
      id: c.id,
      amountTHB: Number(c.amountTHB),
      amountUSD,
      profitUSD,
      itemCount,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      referredMemberName: c.order.user.name,
      referredMemberPhone: c.order.user.phone,
      order: { id: c.order.id, draw: { type: c.order.draw.type, drawDate: c.order.draw.drawDate.toISOString() } },
    })
  }

  return NextResponse.json(Object.values(grouped))
}
