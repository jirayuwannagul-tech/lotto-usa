import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { appointReferrer } from "@/lib/referrals"

type Params = {
  params: Promise<{
    userId: string
  }>
}

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await params
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  })

  if (!user || user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "ไม่พบสมาชิกที่ต้องการแต่งตั้ง" }, { status: 404 })
  }

  const referrer = await appointReferrer(user.id, user.name)

  return NextResponse.json({
    ok: true,
    referralCode: referrer.referralCode,
  })
}
