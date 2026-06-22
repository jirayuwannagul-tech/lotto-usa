import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"

const CANCEL_AFTER_MS = 2 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get("secret")
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    !cronSecret ||
    secret === cronSecret ||
    authHeader === `Bearer ${cronSecret}`

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - CANCEL_AFTER_MS)

  const staleOrders = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lte: cutoff } },
    include: {
      user: { select: { name: true } },
      draw: { select: { type: true, drawDate: true } },
    },
  })

  if (staleOrders.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0 })
  }

  await prisma.order.updateMany({
    where: { id: { in: staleOrders.map((o) => o.id) } },
    data: { status: "REJECTED", note: "ยกเลิกอัตโนมัติ — ไม่ชำระเงินภายใน 2 ชั่วโมง" },
  })

  const lines = [
    `🚫 *ยกเลิกออเดอร์อัตโนมัติ — ไม่ชำระเงินภายใน 2 ชม.*`,
    ``,
    ...staleOrders.map((o) => {
      const drawLabel = o.draw.type === "POWERBALL" ? "Powerball" : "Mega Millions"
      return `• ${o.user.name} — ${drawLabel} (#${o.id.slice(-6)})`
    }),
  ]
  await sendAdminMessage(lines.join("\n")).catch(() => {})

  return NextResponse.json({ ok: true, cancelled: staleOrders.length })
}
