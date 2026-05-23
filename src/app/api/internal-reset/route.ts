import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== "RESET_LOTTO_NOW_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const results: Record<string, string> = {}

  const steps: [string, () => Promise<unknown>][] = [
    ["auditLog", () => prisma.auditLog.deleteMany()],
    ["commission", () => prisma.commission.deleteMany()],
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
