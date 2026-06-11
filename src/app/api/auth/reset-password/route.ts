import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}))

  if (!token || !password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 })
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "ลิงก์หมดอายุหรือใช้งานไปแล้ว" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ])

  return NextResponse.json({ success: true })
}
