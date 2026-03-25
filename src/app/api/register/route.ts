import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables, getReferrerByCode } from "@/lib/referrals"

export async function POST(req: NextRequest) {
  const { name, email, phone, lineId, referralCode, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 })
  }

  await ensureReferralTables()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, { status: 400 })
  }

  let referrer = null
  if (referralCode) {
    referrer = await getReferrerByCode(referralCode)
    if (!referrer) {
      return NextResponse.json({ error: "ไม่พบรหัสผู้แนะนำนี้" }, { status: 400 })
    }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, phone, lineId, passwordHash, role: "CUSTOMER" },
  })

  if (referrer) {
    await prisma.$executeRaw`
      INSERT INTO "UserReferral" ("userId", "referrerUserId", "referralCode")
      VALUES (${user.id}, ${referrer.userId}, ${referrer.referralCode})
    `
  }

  return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}
