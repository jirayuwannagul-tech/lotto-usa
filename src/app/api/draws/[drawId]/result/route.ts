import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage, sendMessage } from "@/lib/telegram"

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

  // Save winning numbers
  await prisma.draw.update({
    where: { id: drawId },
    data: { winningMain, winningSpecial, isOpen: false },
  })

  // Normalize winning numbers for comparison
  const winMain = winningMain
    .split(",")
    .map((n: string) => n.trim().padStart(2, "0"))
    .sort()
  const winSpecial = winningSpecial.trim().padStart(2, "0")

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

      if (matchMain > 0 || matchSpecial) {
        winnerCount++
        const prize = getPrizeLabel(draw.type, matchMain, matchSpecial)
        if (prize) {
          winnerMessages.push(`🏆 ${order.user.name}: ${item.mainNumbers} | ${item.specialNumber} → ${prize}`)
          // Notify the winner directly if they have a telegram chat id stored (future feature)
        }
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
