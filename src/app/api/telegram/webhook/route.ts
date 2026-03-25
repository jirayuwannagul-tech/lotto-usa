import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMessage, downloadFileBuffer, isAllowedChat, type TgUpdate } from "@/lib/telegram"
import { readLotteryTicketFromBuffer, numbersMatch } from "@/lib/ocr"
import { saveBuffer } from "@/lib/upload"

export async function POST(req: NextRequest) {
  // ตรวจ secret token ที่ตั้งตอน setWebhook
  const secret = req.headers.get("x-telegram-bot-api-secret-token")
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const update: TgUpdate = await req.json().catch(() => ({}))
  const msg = update.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat.id

  // ตรวจสิทธิ์ admin
  if (!isAllowedChat(chatId)) {
    await sendMessage(chatId, "⛔ คุณไม่มีสิทธิ์ใช้บอทนี้")
    return NextResponse.json({ ok: true })
  }

  // ---- Commands ----
  if (msg.text) {
    const text = msg.text.trim()

    if (text === "/start" || text === "/help") {
      await handleHelp(chatId)
    } else if (text.startsWith("/summary")) {
      await handleSummary(chatId)
    } else if (text.startsWith("/pending")) {
      await handlePending(chatId)
    } else if (text.startsWith("/orders")) {
      await handleOrders(chatId)
    } else {
      await sendMessage(chatId, "ส่งรูปตั๋วมาเลย หรือพิมพ์ /help")
    }
    return NextResponse.json({ ok: true })
  }

  // ---- Photo / Document ----
  const fileId = msg.photo
    ? msg.photo[msg.photo.length - 1].file_id  // ใช้ขนาดใหญ่สุด
    : msg.document?.mime_type?.startsWith("image/")
      ? msg.document.file_id
      : null

  if (fileId) {
    await handleTicketPhoto(chatId, fileId)
  }

  return NextResponse.json({ ok: true })
}

// ---- Handlers ------------------------------------------------------------

async function handleHelp(chatId: number) {
  await sendMessage(chatId, [
    "🎱 *LottoUSA Admin Bot*",
    "",
    "*คำสั่ง:*",
    "/summary — สรุปยอดงวดที่เปิดอยู่",
    "/pending — รายการที่รอซื้อ (approved แต่ยังไม่มีตั๋ว)",
    "/orders — ออเดอร์ทั้งหมดในงวดที่เปิด",
    "",
    "*อัพโหลดตั๋ว:*",
    "ส่งรูปตั๋วมาในแชทนี้ → บอทจะ OCR อ่านเลขและ match กับออเดอร์อัตโนมัติ",
  ].join("\n"))
}

async function handleSummary(chatId: number) {
  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    include: {
      orders: {
        include: { items: true },
      },
    },
    orderBy: { drawDate: "asc" },
  })

  if (draws.length === 0) {
    await sendMessage(chatId, "ไม่มีงวดที่เปิดอยู่")
    return
  }

  const pendingApproval = await prisma.order.count({ where: { status: "PENDING_APPROVAL" } })
  const pendingPayment = await prisma.order.count({ where: { status: "PENDING_PAYMENT" } })

  const lines: string[] = ["📊 *สรุปยอด LottoUSA*", ""]

  for (const draw of draws) {
    const label = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const drawDate = new Date(draw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    const totalTickets = draw.orders.reduce((s, o) => s + o.items.length, 0)
    const totalTHB = draw.orders.reduce((s, o) => s + Number(o.totalTHB), 0)
    const matched = draw.orders.reduce((s, o) => s + o.items.filter((i) => i.matchedAt).length, 0)

    lines.push(`${label} งวด ${drawDate}`)
    lines.push(`├ ออเดอร์: ${draw.orders.length} | ใบ: ${totalTickets}`)
    lines.push(`├ ยอดรวม: ${totalTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿`)
    lines.push(`└ ตั๋วแล้ว: ${matched}/${totalTickets} ใบ`)
    lines.push("")
  }

  lines.push(`⏳ รอตรวจสลิป: ${pendingApproval}`)
  lines.push(`💳 รอชำระ: ${pendingPayment}`)

  await sendMessage(chatId, lines.join("\n"))
}

async function handlePending(chatId: number) {
  const items = await prisma.orderItem.findMany({
    where: {
      matchedAt: null,
      order: {
        status: { in: ["APPROVED", "TICKET_UPLOADED"] },
      },
    },
    include: {
      order: {
        include: {
          user: { select: { name: true } },
          draw: { select: { type: true, drawDate: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (items.length === 0) {
    await sendMessage(chatId, "✅ ไม่มีรายการรอตั๋ว")
    return
  }

  const lines: string[] = [`📋 *รอตั๋ว ${items.length} ใบ*`, ""]

  for (const item of items) {
    const draw = item.order.draw
    const label = draw.type === "POWERBALL" ? "🔴" : "🔵"
    const drawDate = new Date(draw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
    lines.push(`${label} ${drawDate} | ${item.order.user.name}`)
    lines.push(`   \`${item.mainNumbers} ●${item.specialNumber}\``)
  }

  await sendMessage(chatId, lines.join("\n"))
}

async function handleOrders(chatId: number) {
  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    include: {
      orders: {
        where: { status: { not: "REJECTED" } },
        include: {
          user: { select: { name: true } },
          items: true,
        },
      },
    },
    orderBy: { drawDate: "asc" },
  })

  if (draws.length === 0) {
    await sendMessage(chatId, "ไม่มีงวดที่เปิดอยู่")
    return
  }

  for (const draw of draws) {
    const label = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
    const drawDate = new Date(draw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })

    if (draw.orders.length === 0) continue

    const lines: string[] = [`${label} งวด ${drawDate}`, ""]

    for (const order of draw.orders) {
      for (const item of order.items) {
        const tick = item.matchedAt ? "✅" : "⏳"
        lines.push(`${tick} ${order.user.name}: \`${item.mainNumbers} ●${item.specialNumber}\``)
      }
    }

    await sendMessage(chatId, lines.join("\n"))
  }
}

async function handleTicketPhoto(chatId: number, fileId: string) {
  await sendMessage(chatId, "🔍 กำลัง OCR อ่านเลข...")

  // Download รูป
  const buffer = await downloadFileBuffer(fileId)
  if (!buffer) {
    await sendMessage(chatId, "❌ ดาวน์โหลดรูปไม่ได้")
    return
  }

  // Save to disk
  const photoUrl = await saveBuffer(buffer, "jpg", "tickets")

  // OCR
  const ocr = await readLotteryTicketFromBuffer(buffer)
  if (!ocr) {
    await sendMessage(chatId, [
      "❌ *OCR อ่านไม่ได้*",
      "กรุณาถ่ายรูปให้ชัดขึ้น ไม่มีแสงสะท้อน",
    ].join("\n"))
    return
  }

  await sendMessage(
    chatId,
    `🔢 อ่านได้:\n${ocr.plays.map((play, index) => `${index + 1}. \`${play.mainNumbers.join(",")} ●${play.specialNumber}\``).join("\n")}`
  )

  // Match กับ open draws ทั้งหมด
  const unmatchedItems = await prisma.orderItem.findMany({
    where: {
      matchedAt: null,
      order: {
        status: { in: ["APPROVED", "TICKET_UPLOADED"] },
        draw: { isOpen: true },
      },
    },
    include: {
      order: {
        include: {
          user: { select: { name: true } },
          draw: { select: { type: true, drawDate: true } },
        },
      },
    },
  })

  const matchedItems = ocr.plays
    .map((play) => (
      unmatchedItems.find((item) =>
        numbersMatch(item.mainNumbers, item.specialNumber, play.mainNumbers, play.specialNumber)
      ) ?? null
    ))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  if (matchedItems.length === 0) {
    await sendMessage(chatId, [
      "⚠️ *จับคู่ไม่ได้*",
      `เลขที่อ่าน:\n${ocr.plays.map((play, index) => `${index + 1}. \`${play.mainNumbers.join(",")} ●${play.specialNumber}\``).join("\n")}`,
      "ไม่ตรงกับออเดอร์ที่รออยู่ กรุณาตรวจสอบด้วยตัวเอง",
    ].join("\n"))
    return
  }

  const matchedIds = Array.from(new Set(matchedItems.map((item) => item.id)))
  const affectedOrderIds = Array.from(new Set(matchedItems.map((item) => item.orderId)))

  await prisma.orderItem.updateMany({
    where: { id: { in: matchedIds } },
    data: {
      ticketPhotoUrl: photoUrl,
      ocrRawText: ocr.raw,
      matchedAt: new Date(),
    },
  })

  const statusLines: string[] = []
  for (const orderId of affectedOrderIds) {
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    })
    const allMatched = allItems.every((i) => i.matchedAt !== null)
    await prisma.order.update({
      where: { id: orderId },
      data: { status: allMatched ? "MATCHED" : "TICKET_UPLOADED" },
    })
    const matchedOrder = matchedItems.find((item) => item.orderId === orderId)
    if (matchedOrder) {
      const draw = matchedOrder.order.draw
      const drawDate = new Date(draw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })
      const drawLabel = draw.type === "POWERBALL" ? "🔴" : "🔵"
      statusLines.push(
        `${drawLabel} งวด ${drawDate}\n👤 ${matchedOrder.order.user.name}\n🎫 จับคู่ได้ ${matchedItems.filter((item) => item.orderId === orderId).length} ชุด\n${allMatched ? "🎉 ออเดอร์นี้ครบทุกใบแล้ว" : "📋 ยังมีใบอื่นรออยู่"}`
      )
    }
  }

  await sendMessage(chatId, [
    "✅ *จับคู่สำเร็จ!*",
    ...statusLines,
  ].join("\n"))
}
