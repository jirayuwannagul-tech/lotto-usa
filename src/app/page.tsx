import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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

function getTodayDrawBanner(draws: { type: string; drawDate: Date }[]) {
  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff = new Date(thaiNow)
  cutoff.setHours(14, 30, 0, 0)

  for (const draw of draws) {
    const drawThai = new Date(draw.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    const sameDay =
      drawThai.getFullYear() === thaiNow.getFullYear() &&
      drawThai.getMonth() === thaiNow.getMonth() &&
      drawThai.getDate() === thaiNow.getDate()

    if (sameDay) {
      return {
        type: draw.type,
        status: thaiNow >= cutoff ? ("done" as const) : ("today" as const),
      }
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
    <div
      className="min-h-screen text-white"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, #0d1b3e 0%, #050a14 60%, #0a0a0a 100%)",
      }}
    >
      {/* Ambient glow top */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-20"
        style={{
          background: "radial-gradient(ellipse, #c9a84c 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg, #c9a84c, #f5d485)" }}
          >
            🎱
          </div>
          <span
            className="font-black text-xl tracking-wide"
            style={{ background: "linear-gradient(90deg, #f5d485, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            LottoUSA
          </span>
        </div>
        <p className="text-white/30 text-sm hidden sm:block">ซื้อ Powerball & Mega Millions จากไทย</p>
      </header>

      {/* Today banner */}
      {banner && (
        <div
          className="relative z-10 mx-4 sm:mx-6 mb-2 rounded-xl px-5 py-3 text-center text-sm font-medium"
          style={{
            background: banner.status === "done"
              ? "linear-gradient(90deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))"
              : "linear-gradient(90deg, rgba(234,179,8,0.2), rgba(234,179,8,0.1))",
            border: `1px solid ${banner.status === "done" ? "rgba(16,185,129,0.4)" : "rgba(234,179,8,0.4)"}`,
          }}
        >
          {banner.status === "done" ? (
            <span className="text-emerald-400">
              ✅ วันนี้ <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัลแล้ว
            </span>
          ) : (
            <span className="text-yellow-400">
              ⚡ วันนี้มี <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัล — รอผลหลัง 14:30 น.
            </span>
          )}
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left — Lottery cards */}
          <div className="lg:col-span-3 space-y-5">

            {/* Powerball */}
            <div
              className="rounded-2xl p-[1px] overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.6), rgba(255,255,255,0.05), rgba(220,38,38,0.2))" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{ background: "linear-gradient(135deg, rgba(12,5,20,0.95), rgba(30,10,10,0.9))" }}
              >
                {/* Logo row */}
                <div className="flex items-center gap-4 mb-5">
                  <Image
                    src="/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png"
                    alt="Powerball"
                    width={140}
                    height={56}
                    className="object-contain shrink-0"
                  />
                  <div>
                    <p className="text-white/40 text-xs mt-0.5">จันทร์ · พุธ · เสาร์</p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        background: powerball ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${powerball ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color: powerball ? "#fca5a5" : "#ffffff40",
                      }}
                    >
                      {powerball ? "เปิดรับ" : "ปิดรับ"}
                    </span>
                  </div>
                </div>

                {powerball ? (
                  <>
                    {powerball.jackpot && (
                      <div className="mb-5 text-center py-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-white/40 text-xs mb-1 uppercase tracking-widest">Jackpot สะสม</p>
                        <p
                          className="font-black text-4xl sm:text-5xl"
                          style={{ background: "linear-gradient(90deg, #fde68a, #f59e0b, #fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                        >
                          {powerball.jackpot}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">ออกรางวัล</p>
                        <p className="text-white font-semibold text-sm">{formatThaiDate(powerball.drawDate)}</p>
                        <p className="text-red-400 font-bold mt-1">{formatThaiTime(powerball.drawDate)} น.</p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">ปิดรับออเดอร์</p>
                        <p className="text-white font-semibold text-sm">{formatThaiDate(powerball.cutoffAt)}</p>
                        <p className="text-orange-400 font-bold mt-1">{formatThaiTime(powerball.cutoffAt)} น.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-white/25 text-sm text-center py-4">ยังไม่มีงวดที่เปิดรับ</p>
                )}
              </div>
            </div>

            {/* Mega Millions */}
            <div
              className="rounded-2xl p-[1px] overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.6), rgba(255,255,255,0.05), rgba(234,179,8,0.3))" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{ background: "linear-gradient(135deg, rgba(5,10,25,0.95), rgba(5,15,35,0.9))" }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <Image
                    src="/273-2730781_mega-millions-logo-png.png"
                    alt="Mega Millions"
                    width={140}
                    height={56}
                    className="object-contain shrink-0"
                  />
                  <div>
                    <p className="text-white/40 text-xs mt-0.5">อังคาร · ศุกร์</p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        background: megaMillions ? "rgba(37,99,235,0.2)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${megaMillions ? "rgba(37,99,235,0.5)" : "rgba(255,255,255,0.1)"}`,
                        color: megaMillions ? "#93c5fd" : "#ffffff40",
                      }}
                    >
                      {megaMillions ? "เปิดรับ" : "ปิดรับ"}
                    </span>
                  </div>
                </div>

                {megaMillions ? (
                  <>
                    {megaMillions.jackpot && (
                      <div className="mb-5 text-center py-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-white/40 text-xs mb-1 uppercase tracking-widest">Jackpot สะสม</p>
                        <p
                          className="font-black text-4xl sm:text-5xl"
                          style={{ background: "linear-gradient(90deg, #fde68a, #f59e0b, #fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                        >
                          {megaMillions.jackpot}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">ออกรางวัล</p>
                        <p className="text-white font-semibold text-sm">{formatThaiDate(megaMillions.drawDate)}</p>
                        <p className="text-blue-400 font-bold mt-1">{formatThaiTime(megaMillions.drawDate)} น.</p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">ปิดรับออเดอร์</p>
                        <p className="text-white font-semibold text-sm">{formatThaiDate(megaMillions.cutoffAt)}</p>
                        <p className="text-orange-400 font-bold mt-1">{formatThaiTime(megaMillions.cutoffAt)} น.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-white/25 text-sm text-center py-4">ยังไม่มีงวดที่เปิดรับ</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — Login / Dashboard */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl p-[1px] sticky top-6"
              style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.5), rgba(255,255,255,0.05), rgba(201,168,76,0.2))" }}
            >
              <div
                className="rounded-2xl p-6"
                style={{ background: "linear-gradient(160deg, rgba(15,12,30,0.97), rgba(10,8,20,0.95))" }}
              >
                {session ? (
                  <div className="text-center space-y-5">
                    <div>
                      <p className="text-white/40 text-sm">ยินดีต้อนรับกลับ</p>
                      <p
                        className="font-bold text-xl mt-1"
                        style={{ background: "linear-gradient(90deg, #f5d485, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                      >
                        {session.user.name}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="block w-full py-3 rounded-xl font-semibold text-slate-900 text-center transition hover:opacity-90"
                      style={{ background: "linear-gradient(90deg, #f5d485, #c9a84c)" }}
                    >
                      ไปที่ Dashboard →
                    </Link>
                    {draws.length > 0 && (
                      <Link
                        href="/orders/new"
                        className="block w-full py-3 rounded-xl font-semibold text-center transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(201,168,76,0.3)",
                          color: "#f5d485",
                        }}
                      >
                        🎟 ซื้อหวยเลย
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h3
                        className="font-black text-xl"
                        style={{ background: "linear-gradient(90deg, #f5d485, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                      >
                        เข้าสู่ระบบ
                      </h3>
                      <p className="text-white/30 text-xs mt-1">สำหรับสมาชิกเท่านั้น</p>
                    </div>
                    <LoginForm />
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 mt-4">
        <p className="text-white/15 text-xs">© 2026 LottoUSA · ซื้อหวยอเมริกาจากไทย</p>
      </footer>
    </div>
  )
}
