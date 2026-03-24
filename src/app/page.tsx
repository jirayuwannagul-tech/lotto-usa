import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LotterySection } from "@/components/customer/LotterySection"

const PT_OFFSET = 7 // PDT = UTC-7 (LA time, Mar–Nov)
const SCHEDULE = {
  POWERBALL:     { days: [1, 3, 6], hourPT: 22, minPT: 59 }, // 10:59 PM PDT = 12:59 Thai
  MEGA_MILLIONS: { days: [2, 5],    hourPT: 23, minPT: 0  }, // 11:00 PM PDT = 13:00 Thai
}

async function syncDraws() {
  const now = new Date()
  const nowPT = new Date(now.getTime() - PT_OFFSET * 3600000)
  for (const [type, s] of Object.entries(SCHEDULE) as [keyof typeof SCHEDULE, typeof SCHEDULE[keyof typeof SCHEDULE]][]) {
    for (let i = 0; i <= 7; i++) {
      const d = new Date(nowPT); d.setUTCDate(nowPT.getUTCDate() + i)
      if (!s.days.includes(d.getUTCDay())) continue
      // hourPT + PT_OFFSET = UTC (e.g. 22+7=29 → next day 05:xx UTC = 12:xx Thai)
      const drawUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.hourPT + PT_OFFSET, s.minPT))
      const cutoffUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 0))
      if (cutoffUTC <= now) continue
      const exists = await prisma.draw.findFirst({ where: { type, drawDate: drawUTC } })
      if (!exists) await prisma.draw.create({ data: { type, drawDate: drawUTC, cutoffAt: cutoffUTC } })
      break
    }
  }
  await prisma.draw.updateMany({ where: { isOpen: true, cutoffAt: { lt: now } }, data: { isOpen: false } })
}

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", ...opts })
}


export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  // Only sync if no open draws exist (avoids DB overhead on every load)
  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) await syncDraws()

  const draws = await prisma.draw.findMany({ where: { isOpen: true }, orderBy: { drawDate: "asc" } })

  const enriched = draws.map((d) => ({
    id: d.id,
    type: d.type,
    drawDate: d.drawDate.toISOString(),
    cutoffAt: d.cutoffAt.toISOString(),
    jackpot: d.jackpot,
    drawDateThai: fmt(d.drawDate, { weekday: "long", day: "numeric", month: "long" }),
    drawTimeThai: fmt(d.drawDate, { hour: "2-digit", minute: "2-digit" }),
    cutoffDateThai: fmt(d.cutoffAt, { weekday: "short", day: "numeric", month: "short" }),
    cutoffTimeThai: fmt(d.cutoffAt, { hour: "2-digit", minute: "2-digit" }),
  }))

  // Today draw banner
  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff1430 = new Date(thaiNow); cutoff1430.setHours(14, 30, 0, 0)
  const todayDraw = draws.find((d) => {
    const dt = new Date(d.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    return dt.getFullYear() === thaiNow.getFullYear() && dt.getMonth() === thaiNow.getMonth() && dt.getDate() === thaiNow.getDate()
  })

  return (
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(ellipse at 20% 50%,#0d1b3e 0%,#050a14 60%,#0a0a0a 100%)" }}>
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] opacity-15" style={{ background: "radial-gradient(ellipse,#c9a84c 0%,transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 max-w-7xl mx-auto flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#c9a84c,#f5d485)" }}>🎱</div>
          <span className="font-black text-lg tracking-wide" style={{ background: "linear-gradient(90deg,#f5d485,#c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LottoUSA</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-white/25 text-sm hidden sm:block">ซื้อ Powerball & Mega Millions จากไทย</p>
          <a href="/admin" className="text-white/20 hover:text-white/50 text-xs transition">Admin</a>
        </div>
      </header>

      {/* Today banner */}
      {todayDraw && (
        <div className="relative z-10 mx-4 sm:mx-6 mt-4 rounded-xl px-5 py-2.5 text-center text-sm font-medium"
          style={{
            background: thaiNow >= cutoff1430 ? "linear-gradient(90deg,rgba(16,185,129,.15),rgba(16,185,129,.08))" : "linear-gradient(90deg,rgba(234,179,8,.15),rgba(234,179,8,.08))",
            border: `1px solid ${thaiNow >= cutoff1430 ? "rgba(16,185,129,.3)" : "rgba(234,179,8,.3)"}`,
          }}>
          {thaiNow >= cutoff1430
            ? <span className="text-emerald-400">✅ วันนี้ <strong>{todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัลแล้ว</span>
            : <span className="text-yellow-400">⚡ วันนี้มี <strong>{todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัล — ผลหลัง 14:30 น.</span>
          }
        </div>
      )}

      {/* Top jackpot banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Powerball jackpot */}
          <div className="rounded-2xl px-6 py-5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04))", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div>
              <p className="text-red-400 font-bold text-base">🔴 Powerball</p>
              <p className="text-white/40 text-xs mt-0.5">รางวัลที่ 1</p>
            </div>
            <div className="text-right">
              <p className="font-black text-4xl sm:text-5xl" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {enriched.find(d => d.type === "POWERBALL")?.jackpot ?? "—"}
              </p>
            </div>
          </div>
          {/* Mega Millions jackpot */}
          <div className="rounded-2xl px-6 py-5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.12),rgba(59,130,246,0.04))", border: "1px solid rgba(59,130,246,0.25)" }}>
            <div>
              <p className="text-blue-400 font-bold text-base">🔵 Mega Millions</p>
              <p className="text-white/40 text-xs mt-0.5">รางวัลที่ 1</p>
            </div>
            <div className="text-right">
              <p className="font-black text-4xl sm:text-5xl" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {enriched.find(d => d.type === "MEGA_MILLIONS")?.jackpot ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lottery section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-8 pb-12">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">งวดที่เปิดรับ — เลือกเลขได้เลย</h2>
        <LotterySection draws={enriched} isLoggedIn={!!session} />
      </section>

      <footer className="relative z-10 text-center pb-8">
        <p className="text-white/10 text-xs">© 2026 LottoUSA · ซื้อหวยอเมริกาจากไทย</p>
      </footer>
    </div>
  )
}
