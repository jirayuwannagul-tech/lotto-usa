import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendRealtimeMessage, sendApprovalRequest } from "@/lib/telegram"

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== "RESET_LOTTO_NOW_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const results: Record<string, string> = {}

  const steps: [string, () => Promise<unknown>][] = [
    ["auditLog", () => prisma.auditLog.deleteMany()],
    ["commission", () => prisma.commission.deleteMany()],
    ["walletTransaction", () => prisma.walletTransaction.deleteMany()],
    ["userReferral", () => prisma.userReferral.deleteMany()],
    ["passwordResetToken", () => prisma.passwordResetToken.deleteMany()],
    ["payment", () => prisma.payment.deleteMany()],
    ["orderItem", () => prisma.orderItem.deleteMany()],
    ["order", () => prisma.order.deleteMany()],
    ["referrerProfile", () => prisma.referrerProfile.deleteMany()],
    ["user", () => prisma.user.deleteMany()],
  ]

  for (const [name, fn] of steps) {
    try {
      await fn()
      results[name] = "ok"
    } catch (e) {
      results[name] = `skip: ${e instanceof Error ? e.message : "error"}`
    }
  }

  return NextResponse.json({ ok: true, results })
}

export async function PUT(req: NextRequest) {
  const { secret, phone, password, name } = await req.json().catch(() => ({}))
  if (secret !== "RESET_LOTTO_NOW_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const bcrypt = await import("bcryptjs")
  const hash = await bcrypt.hash(String(password), 12)
  const user = await prisma.user.upsert({
    where: { phone: String(phone) },
    update: { passwordHash: hash, role: "ADMIN", name: String(name ?? phone) },
    create: {
      name: String(name ?? phone),
      phone: String(phone),
      email: `${phone}@lottousathai.com`,
      passwordHash: hash,
      role: "ADMIN",
    },
  })
  return NextResponse.json({ ok: true, id: user.id, phone: user.phone, role: user.role })
}

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== "RESET_LOTTO_NOW_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { user: true, draw: true, items: true, payment: true },
  })

  for (const order of orders) {
    const drawLabel = order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const orderTotal = Number(order.totalTHB)
    const escapeMd = (s: string) => s.replace(/[_*`[\]]/g, "\\$&")
    const adminUrl = `${process.env.NEXTAUTH_URL ?? ""}/admin/orders`
    const msg =
      `📎 *มีออเดอร์รอกดอนุมัติ*\n\n` +
      `👤 ${escapeMd(order.user.name)}\n` +
      `🎱 ${drawLabel}\n` +
      `🎫 ${order.items.length} ชุด\n` +
      `💰 ${orderTotal.toLocaleString("th-TH")} ฿\n` +
      `\n🔗 ${adminUrl}`
    await sendRealtimeMessage(msg).catch(() => {})
    await sendApprovalRequest(order.id, msg).catch(() => {})
  }

  return NextResponse.json({ ok: true, resent: orders.length })
}
