import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import LoginForm from "@/components/shared/LoginForm"

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function formatThaiTime(date: Date) {
  return date.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Check if a draw has happened today (Thai time) — draw time passed and it's after 14:30 Thai
function getTodayDrawBanner(draws: { type: string; drawDate: Date }[]) {
  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff1430 = new Date(thaiNow)
  cutoff1430.setHours(14, 30, 0, 0)

  for (const draw of draws) {
    const drawThai = new Date(draw.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    const sameDay =
      drawThai.getFullYear() === thaiNow.getFullYear() &&
      drawThai.getMonth() === thaiNow.getMonth() &&
      drawThai.getDate() === thaiNow.getDate()

    if (sameDay && thaiNow >= cutoff1430) {
      return { type: draw.type, status: "done" as const }
    }
    if (sameDay && thaiNow < cutoff1430) {
      return { type: draw.type, status: "today" as const }
    }
  }
  return null
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const powerball = draws.find((d) => d.type === "POWERBALL")
  const megaMillions = draws.find((d) => d.type === "MEGA_MILLIONS")
  const banner = getTodayDrawBanner(draws)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🎱</span>
          <span className="text-white font-bold text-xl">LottoUSA</span>
          <span className="text-white/40 text-sm ml-2">ซื้อหวยอเมริกาจากไทย</span>
        </div>
      </header>

      {/* Today banner */}
      {banner && (
        <div className={`py-3 px-6 text-center text-sm font-medium ${banner.status === "done" ? "bg-green-600/80" : "bg-yellow-500/80"}`}>
          {banner.status === "done" ? (
            <span className="text-white">
              ✅ วันนี้{" "}
              <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong>{" "}
              ออกรางวัลแล้ว (หลัง 14:30 น.)
            </span>
          ) : (
            <span className="text-slate-900">
              ⚡ วันนี้มี{" "}
              <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong>{" "}
              ออกรางวัล — ผลจะทราบหลัง 14:30 น.
            </span>
          )}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left — Lottery info */}
          <div className="lg:col-span-3 space-y-5">
            <h2 className="text-white/60 text-sm uppercase tracking-widest">งวดที่เปิดรับอยู่</h2>

            {/* Powerball */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                {/* Powerball logo style */}
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50">
                  <span className="text-white font-black text-xs text-center leading-tight">POWER<br/>BALL</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Powerball</h3>
                  <p className="text-white/40 text-xs">จันทร์ • พุธ • เสาร์</p>
                </div>
              </div>
              {powerball ? (
                <>
                  {powerball.jackpot && (
                    <div className="mb-3">
                      <p className="text-white/50 text-xs mb-1">Jackpot สะสม</p>
                      <p className="text-yellow-400 font-bold text-3xl">{powerball.jackpot}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">ออกรางวัล (ไทย)</p>
                      <p className="text-white font-medium">{formatThaiDate(powerball.drawDate)}</p>
                      <p className="text-blue-300 text-xs">{formatThaiTime(powerball.drawDate)} น.</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">ปิดรับออเดอร์ (ไทย)</p>
                      <p className="text-white font-medium">{formatThaiDate(powerball.cutoffAt)}</p>
                      <p className="text-orange-300 text-xs">{formatThaiTime(powerball.cutoffAt)} น.</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white/30 text-sm">ยังไม่มีงวดที่เปิดรับ</p>
              )}
            </div>

            {/* Mega Millions */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                {/* Mega Millions logo style */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center shadow-lg shadow-blue-900/50 border-2 border-yellow-400">
                  <span className="text-yellow-400 font-black text-xs text-center leading-tight">MEGA<br/>M</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Mega Millions</h3>
                  <p className="text-white/40 text-xs">อังคาร • ศุกร์</p>
                </div>
              </div>
              {megaMillions ? (
                <>
                  {megaMillions.jackpot && (
                    <div className="mb-3">
                      <p className="text-white/50 text-xs mb-1">Jackpot สะสม</p>
                      <p className="text-yellow-400 font-bold text-3xl">{megaMillions.jackpot}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">ออกรางวัล (ไทย)</p>
                      <p className="text-white font-medium">{formatThaiDate(megaMillions.drawDate)}</p>
                      <p className="text-blue-300 text-xs">{formatThaiTime(megaMillions.drawDate)} น.</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/40 text-xs mb-1">ปิดรับออเดอร์ (ไทย)</p>
                      <p className="text-white font-medium">{formatThaiDate(megaMillions.cutoffAt)}</p>
                      <p className="text-orange-300 text-xs">{formatThaiTime(megaMillions.cutoffAt)} น.</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-white/30 text-sm">ยังไม่มีงวดที่เปิดรับ</p>
              )}
            </div>
          </div>

          {/* Right — Login or Dashboard */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sticky top-6">
              {session ? (
                <div className="text-center space-y-4">
                  <p className="text-white/60 text-sm">ยินดีต้อนรับกลับ</p>
                  <p className="text-white font-bold text-lg">{session.user.name}</p>
                  <Link
                    href="/dashboard"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-center transition"
                  >
                    ไปที่ Dashboard →
                  </Link>
                  {(draws.length > 0) && (
                    <Link
                      href="/orders/new"
                      className="block w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold py-3 rounded-lg text-center transition"
                    >
                      🎟 ซื้อหวยเลย
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-white font-semibold text-lg mb-5 text-center">เข้าสู่ระบบสมาชิก</h3>
                  <LoginForm />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
