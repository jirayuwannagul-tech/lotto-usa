import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminMessage } from "@/lib/telegram"

async function announceResult(draw: {
  type: string
  drawDate: Date
  winningMain: string
  winningSpecial: string
}) {
  const typeLabel = draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
  const dateThai = draw.drawDate.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const balls = draw.winningMain.split(",").map((n) => n.trim())
  const ballLine = balls.map((n) => `(${n})`).join("  ") + `  ⭐ *${draw.winningSpecial.trim()}*`
  const msg = `🎱 *ผลหวย ${typeLabel}*\n📅 งวด ${dateThai}\n\n${ballLine}\n\n_ตรวจสอบเลขในแดชบอร์ดของคุณได้เลย_`
  await sendAdminMessage(msg)
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const draws = await prisma.draw.findMany({
    where: {
      winningMain: { not: null },
      winningSpecial: { not: null },
    },
    orderBy: { drawDate: "desc" },
    take: 20,
  })

  let announced = 0
  for (const draw of draws) {
    if (!draw.winningMain || !draw.winningSpecial) continue
    await announceResult({
      type: draw.type,
      drawDate: draw.drawDate,
      winningMain: draw.winningMain,
      winningSpecial: draw.winningSpecial,
    })
    announced++
  }

  return NextResponse.json({ ok: true, announced })
}
