import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { name, email, phone, lineId, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, phone, lineId, passwordHash, role: "CUSTOMER" },
  })

  return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}
