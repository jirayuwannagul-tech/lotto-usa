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
      ticketPhotoUrl,
      message: "OCR อ่านตั๋วไม่ได้ กรุณาตรวจสอบรูปภาพ",
    })
  }

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

  const matchGroups = ocr.plays.map((play, playIndex) => {
    const candidates = unmatchedItems
      .filter((item) => numbersMatch(item.mainNumbers, item.specialNumber, play.mainNumbers, play.specialNumber))
      .map((item) => ({
        orderItemId: item.id,
        orderId: item.orderId,
        customerName: item.order.user.name,
        customerEmail: item.order.user.email,
        numbers: `${item.mainNumbers} | ${item.specialNumber}`,
        orderStatus: item.order.status,
      }))

    return {
      playIndex,
      numbers: `${play.mainNumbers.join(",")} | ${play.specialNumber}`,
      candidates,
    }
  })

  const matchedCandidates = matchGroups.flatMap((group) => group.candidates)

  if (matchedCandidates.length > 0) {
    return NextResponse.json({
      success: true,
      requiresReview: true,
      ticketPhotoUrl,
      ocrRawText: ocr.raw,
      ocrResults: ocr.plays,
      matchGroups,
      message: "AI อ่านเลขหลายชุดแล้ว กรุณาตรวจสอบและยืนยันรายการที่ถูกต้อง",
    })
  }

  await sendLineNotify(
    `⚠️ OCR จับคู่ตั๋วไม่ได้\nเลขที่อ่านได้:\n${ocr.plays.map((play) => `${play.mainNumbers.join(",")} | ${play.specialNumber}`).join("\n")}\nกรุณาตรวจสอบด้วยตัวเอง`
  )

  return NextResponse.json({
    success: true,
    requiresReview: true,
    ticketPhotoUrl,
    ocrRawText: ocr.raw,
    ocrResults: ocr.plays,
    matchGroups: [],
    message: "OCR อ่านได้แต่จับคู่กับออเดอร์ไม่ได้ แจ้ง Admin ทาง LINE แล้ว",
  })
}
