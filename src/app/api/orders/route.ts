import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getExchangeRate } from "@/lib/exchange-rate"
import { LOTTERY_RULES, MARGIN_USD } from "@/lib/lottery-rules"
import { isCutoffPassed } from "@/lib/cutoff"
import { createCommissionForOrder, ensureReferralTables } from "@/lib/referrals"
import { sendRealtimeMessage } from "@/lib/telegram"
import { z } from "zod"

const itemSchema = z.object({
  mainNumbers: z.array(z.string().regex(/^\d{1,2}$/)).min(1).max(10),
  specialNumber: z.string().regex(/^\d{1,2}$/),
}).superRefine((item, ctx) => {
  const normalized = item.mainNumbers.map((value) => value.padStart(2, "0"))
  if (new Set(normalized).size !== normalized.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "เลขหลักห้ามซ้ำกัน",
      path: ["mainNumbers"],
    })
  }
})

const createOrderSchema = z.object({
  drawId: z.string().min(1),
  items: z.array(itemSchema).min(1).max(20),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const drawId = searchParams.get("drawId")

  const where =
    session.user.role === "ADMIN"
      ? drawId ? { drawId } : {}
      : { userId: session.user.id, ...(drawId ? { drawId } : {}) }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, phone: true, lineId: true } },
      draw: true,
      items: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "เฉพาะสมาชิกเท่านั้นที่สามารถสั่งซื้อหวยได้" }, { status: 403 })
  }
  await ensureReferralTables()

  const body = await req.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { drawId, items } = parsed.data

  const draw = await prisma.draw.findUnique({ where: { id: drawId } })
  if (!draw || !draw.isOpen) {
    return NextResponse.json({ error: "งวดนี้ปิดแล้ว" }, { status: 400 })
  }
  if (isCutoffPassed(draw.cutoffAt)) {
    return NextResponse.json({ error: "หมดเวลารับออเดอร์แล้ว" }, { status: 400 })
  }

  const rule = LOTTERY_RULES[draw.type as keyof typeof LOTTERY_RULES]

  // Validate number ranges for this draw type
  for (const item of items) {
    if (item.mainNumbers.length !== rule.mainCount) {
      return NextResponse.json(
        { error: `ต้องเลือก ${rule.mainCount} เลขหลัก` },
        { status: 400 }
      )
    }
    const invalidMain = item.mainNumbers.find((n) => {
      const num = parseInt(n)
      return num < 1 || num > rule.mainMax
    })
    if (invalidMain) {
      return NextResponse.json(
        { error: `เลขหลักต้องอยู่ระหว่าง 1-${rule.mainMax}` },
        { status: 400 }
      )
    }
    const special = parseInt(item.specialNumber)
    if (special < 1 || special > rule.specialMax) {
      return NextResponse.json(
        { error: `${rule.specialLabel} ต้องอยู่ระหว่าง 1-${rule.specialMax}` },
        { status: 400 }
      )
    }
  }

  const pricePerTicket = rule.priceUSD + MARGIN_USD
  const rate = await getExchangeRate()
  const totalUSD = pricePerTicket * items.length
  const totalTHB = totalUSD * rate

  // Use transaction to ensure order + items are created atomically
  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        userId: session.user.id,
        drawId,
        totalUSD,
        totalTHB,
        rateUsed: rate,
        items: {
          create: items.map((item) => ({
            mainNumbers: [...item.mainNumbers]
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map((n) => n.padStart(2, "0"))
              .join(","),
            specialNumber: String(item.specialNumber).padStart(2, "0"),
          })),
        },
      },
      include: { items: true },
    })
  })

  await createCommissionForOrder({
    orderId: order.id,
    referredUserId: session.user.id,
    itemCount: order.items.length,
    rateUsed: Number(order.rateUsed),
  })

  const drawLabel = draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"
  await sendRealtimeMessage(
    `🆕 *มีออเดอร์ใหม่*\n\n👤 ${session.user.name}\n🎯 ${drawLabel}\n🎫 ${order.items.length} ชุด\n💰 ${Number(order.totalTHB).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท\n\nยังรอการชำระเงิน/แนบสลิป`
  )

  return NextResponse.json(order, { status: 201 })
}
