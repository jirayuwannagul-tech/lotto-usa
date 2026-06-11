import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getReferrerByCode } from "@/lib/referrals"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { referralCode } = await req.json().catch(() => ({}))
  const code = typeof referralCode === "string" ? referralCode.trim().toUpperCase() : ""
  if (!code) return NextResponse.json({ error: "กรุณาระบุรหัสผู้แนะนำ" }, { status: 400 })

  const existing = await prisma.userReferral.findUnique({ where: { userId: session.user.id } })
  if (existing) return NextResponse.json({ error: "มีรหัสผู้แนะนำอยู่แล้ว" }, { status: 409 })

  const referrer = await getReferrerByCode(code)
  if (!referrer) return NextResponse.json({ error: `ไม่พบรหัสผู้แนะนำ "${code}"` }, { status: 404 })
  if (referrer.userId === session.user.id) {
    return NextResponse.json({ error: "ไม่สามารถใช้รหัสของตัวเองได้" }, { status: 400 })
  }

  await prisma.userReferral.create({
    data: { userId: session.user.id, referrerUserId: referrer.userId, referralCode: referrer.referralCode },
  })

  return NextResponse.json({ ok: true, referralCode: referrer.referralCode })
}
