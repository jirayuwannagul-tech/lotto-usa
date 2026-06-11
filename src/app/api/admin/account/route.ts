import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { name, phone, currentPassword, newPassword } = await req.json().catch(() => ({}))

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (name?.trim()) updates.name = name.trim()
  if (phone?.trim()) {
    const clean = phone.trim().replace(/[\s\-()]/g, "")
    const existing = await prisma.user.findUnique({ where: { phone: clean } })
    if (existing && existing.id !== admin.id) {
      return NextResponse.json({ error: "เบอร์โทรนี้ถูกใช้แล้ว" }, { status: 409 })
    }
    updates.phone = clean
    updates.email = `${clean}@lottousathai.com`
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบัน" }, { status: 400 })
    }
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 })
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการแก้ไข" }, { status: 400 })
  }

  const updated = await prisma.user.update({ where: { id: admin.id }, data: updates })
  return NextResponse.json({ ok: true, name: updated.name, phone: updated.phone })
}
