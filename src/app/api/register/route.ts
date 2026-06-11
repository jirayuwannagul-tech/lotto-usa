import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ensureReferralTables, getReferrerByCode } from "@/lib/referrals"

export async function POST(req: NextRequest) {
  const { phone, referralCode, password } = await req.json()

  if (!phone || !password) {
    return NextResponse.json({ error: "กรุณากรอกเบอร์โทรและรหัสผ่าน" }, { status: 400 })
  }

  const cleanPhone = String(phone).replace(/[\s\-()]/g, "")
  if (!/^\+?[0-9]{6,15}$/.test(cleanPhone)) {
    return NextResponse.json({ error: "เบอร์โทรไม่ถูกต้อง (6-15 ตัวเลข)" }, { status: 400 })
  }

  if (String(password).length < 4) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 4 ตัว" }, { status: 400 })
  }

  await ensureReferralTables()

  const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } })
  if (existing) {
    return NextResponse.json({ error: "เบอร์โทรนี้ถูกใช้แล้ว" }, { status: 400 })
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
    data: {
      name: cleanPhone,
      phone: cleanPhone,
      email: `${cleanPhone}@lottousathai.com`,
      passwordHash,
      role: "CUSTOMER",
    },
  })

  if (referrer) {
    await prisma.userReferral.create({
      data: { userId: user.id, referrerUserId: referrer.userId, referralCode: referrer.referralCode },
    })
  }

  return NextResponse.json({ id: user.id, phone: user.phone })
}
