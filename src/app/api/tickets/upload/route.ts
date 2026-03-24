import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/upload"
import { readLotteryTicketFromBuffer, numbersMatch } from "@/lib/ocr"
import { sendLineNotify } from "@/lib/line-notify"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const drawId = formData.get("drawId") as string
  const file = formData.get("ticket") as File | null

  if (!drawId || !file) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
  }

  let upload
  try {
    upload = await saveUploadedFile(file, "tickets")
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const ticketPhotoUrl = upload.assetPath
  const ocr = await readLotteryTicketFromBuffer(upload.buffer, upload.contentType)

  if (!ocr) {
    return NextResponse.json({
      success: false,
      matched: false,
      ticketPhotoUrl,
      message: "OCR อ่านตั๋วไม่ได้ กรุณาตรวจสอบรูปภาพ",
    })
  }

  // Find all unmatched OrderItems for this draw
  const unmatchedItems = await prisma.orderItem.findMany({
    where: {
      matchedAt: null,
      order: {
        drawId,
        status: { in: ["APPROVED", "TICKET_UPLOADED"] },
      },
    },
    include: {
      order: {
        include: { user: true },
      },
    },
  })

  // Try to match OCR result against unmatched items
  let matchedItem = null
  for (const item of unmatchedItems) {
    if (numbersMatch(item.mainNumbers, item.specialNumber, ocr.mainNumbers, ocr.specialNumber)) {
      matchedItem = item
      break
    }
  }

  if (matchedItem) {
    // Update matched item
    await prisma.orderItem.update({
      where: { id: matchedItem.id },
      data: {
        ticketPhotoUrl,
        ocrRawText: ocr.raw,
        matchedAt: new Date(),
      },
    })

    // Check if all items in order are matched
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: matchedItem.orderId },
    })
    const allMatched = allItems.every((i) => i.matchedAt !== null || i.id === matchedItem!.id)

    if (allMatched) {
      await prisma.order.update({
        where: { id: matchedItem.orderId },
        data: { status: "MATCHED" },
      })
    } else {
      await prisma.order.update({
        where: { id: matchedItem.orderId },
        data: { status: "TICKET_UPLOADED" },
      })
    }

    return NextResponse.json({
      success: true,
      matched: true,
      ticketPhotoUrl,
      matchedOrderItemId: matchedItem.id,
      customerName: matchedItem.order.user.name,
      numbers: `${matchedItem.mainNumbers} | ${matchedItem.specialNumber}`,
    })
  }

  // No match found — alert admin via LINE
  await sendLineNotify(
    `⚠️ OCR จับคู่ตั๋วไม่ได้\nเลขที่อ่านได้: ${ocr.mainNumbers.join(",")} | ${ocr.specialNumber}\nกรุณาตรวจสอบด้วยตัวเอง`
  )

  return NextResponse.json({
    success: true,
    matched: false,
    ticketPhotoUrl,
    ocrResult: { mainNumbers: ocr.mainNumbers, specialNumber: ocr.specialNumber },
    message: "OCR อ่านได้แต่จับคู่กับออเดอร์ไม่ได้ แจ้ง Admin ทาง LINE แล้ว",
  })
}
