import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "กรุณากรอกอีเมล" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ success: true })
  }

  // Invalidate old tokens
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
  } catch (err) {
    console.error("[forgot-password] notify failed", err)
  }

  return NextResponse.json({ success: true, resetUrl })
}
