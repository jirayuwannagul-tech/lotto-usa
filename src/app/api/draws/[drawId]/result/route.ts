import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"
import { LOTTERY_RULES } from "@/lib/lottery-rules"

function parseWinningNumbers(rawMain: string, rawSpecial: string, type: keyof typeof LOTTERY_RULES) {
  const rule = LOTTERY_RULES[type]
  const mainNumbers = rawMain
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10))
  const specialNumber = Number.parseInt(rawSpecial.trim(), 10)

  if (mainNumbers.length !== rule.mainCount) {
    throw new Error(`ต้องกรอก ${rule.mainCount} เลขหลัก`)
  }
  if (mainNumbers.some((value) => Number.isNaN(value) || value < 1 || value > rule.mainMax)) {
    throw new Error(`เลขหลักต้องอยู่ระหว่าง 1-${rule.mainMax}`)
  }
  if (new Set(mainNumbers).size !== mainNumbers.length) {
    throw new Error("เลขหลักห้ามซ้ำกัน")
  }
  if (Number.isNaN(specialNumber) || specialNumber < 1 || specialNumber > rule.specialMax) {
    throw new Error(`${rule.specialLabel} ต้องอยู่ระหว่าง 1-${rule.specialMax}`)
  }

  return {
    winningMain: mainNumbers.map((value) => String(value).padStart(2, "0")).sort().join(","),
    winningSpecial: String(specialNumber).padStart(2, "0"),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ drawId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { drawId } = await params
  const body = await req.json().catch(() => null)
  const { winningMain, winningSpecial } = body ?? {}

  if (!winningMain || !winningSpecial) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 })
  }

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: {
      orders: {
        where: { status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] } },
        include: { user: true, items: true },
      },
    },
  })
  if (!draw) return NextResponse.json({ error: "ไม่พบงวด" }, { status: 404 })
  if (draw.winningMain || draw.winningSpecial) {
    return NextResponse.json({ error: "งวดนี้ประกาศผลแล้ว" }, { status: 409 })
  }

  let normalized
  try {
    normalized = parseWinningNumbers(winningMain, winningSpecial, draw.type)
  } catch (error) {
    const message = error instanceof Error ? error.message : "ข้อมูลผลรางวัลไม่ถูกต้อง"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await prisma.draw.update({
    where: { id: drawId },
    data: {
      winningMain: normalized.winningMain,
      winningSpecial: normalized.winningSpecial,
      isOpen: false,
    },
  })

  const winMain = normalized.winningMain
    .split(",")
    .map((n: string) => n.trim())
    .sort()
  const winSpecial = normalized.winningSpecial

  const drawLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const drawDateThai = draw.drawDate.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  })

  // Check each order's items for winners
  let winnerCount = 0
  const winnerMessages: string[] = []

  for (const order of draw.orders) {
    for (const item of order.items) {
      const itemMain = item.mainNumbers.split(",").map((n) => n.trim().padStart(2, "0")).sort()
      const itemSpecial = item.specialNumber.trim().padStart(2, "0")

      const matchMain = itemMain.filter((n) => winMain.includes(n)).length
      const matchSpecial = itemSpecial === winSpecial

      const prize = getPrizeLabel(draw.type, matchMain, matchSpecial)
      if (prize) {
        winnerCount++
        winnerMessages.push(`🏆 ${order.user.name}: ${item.mainNumbers} | ${item.specialNumber} → ${prize}`)
      }
    }
  }

  // Admin summary
  const winMainDisplay = winMain.join(", ")
  await sendAdminMessage(
    `🎉 *ประกาศผล ${drawLabel}*\nงวด ${drawDateThai}\n\n🔢 เลขออก: \`${winMainDisplay}\`\n⭐ ${draw.type === "POWERBALL" ? "Powerball" : "Mega Ball"}: \`${winSpecial}\`\n\n${winnerCount > 0 ? winnerMessages.join("\n") : "ไม่มีผู้ถูกรางวัล"}`
  )

  return NextResponse.json({ winnerCount, winnerMessages })
}

function getPrizeLabel(type: string, matchMain: number, matchSpecial: boolean): string | null {
  const special = type === "POWERBALL" ? "Powerball" : "Mega Ball"
  if (matchMain === 5 && matchSpecial) return `🥇 แจ็คพอต!`
  if (matchMain === 5) return `🥈 Match 5`
  if (matchMain === 4 && matchSpecial) return `Match 4+${special}`
  if (matchMain === 4) return `Match 4`
  if (matchMain === 3 && matchSpecial) return `Match 3+${special}`
  if (matchMain === 3) return `Match 3`
  if (matchMain === 2 && matchSpecial) return `Match 2+${special}`
  if (matchMain === 1 && matchSpecial) return `Match 1+${special}`
  if (matchMain === 0 && matchSpecial) return `Match ${special}`
  return null
}
