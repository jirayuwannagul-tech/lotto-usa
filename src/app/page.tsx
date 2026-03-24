import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LotterySection } from "@/components/customer/LotterySection"

const ET_OFFSET = 4
const SCHEDULE = {
  POWERBALL:     { days: [1, 3, 6], hourET: 22, minET: 59 },
  MEGA_MILLIONS: { days: [2, 5],    hourET: 23, minET: 0  },
}

async function syncDraws() {
  const now = new Date()
  const nowET = new Date(now.getTime() - ET_OFFSET * 3600000)
  for (const [type, s] of Object.entries(SCHEDULE) as [keyof typeof SCHEDULE, typeof SCHEDULE[keyof typeof SCHEDULE]][]) {
    for (let i = 0; i <= 7; i++) {
      const d = new Date(nowET); d.setUTCDate(nowET.getUTCDate() + i)
      if (!s.days.includes(d.getUTCDay())) continue
      const drawUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.hourET + ET_OFFSET, s.minET))
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

const PB_PRIZES = [
  { match: "5 + Powerball", prize: "Jackpot", color: "#fbbf24" },
  { match: "5 เลข", prize: "$1,000,000", color: "#f87171" },
  { match: "4 + Powerball", prize: "$50,000", color: "#fb923c" },
  { match: "4 เลข", prize: "$100", color: "#a3a3a3" },
  { match: "3 + Powerball", prize: "$100", color: "#a3a3a3" },
  { match: "3 เลข", prize: "$7", color: "#a3a3a3" },
  { match: "2 + Powerball", prize: "$7", color: "#a3a3a3" },
  { match: "Powerball", prize: "$4", color: "#a3a3a3" },
]
const MM_PRIZES = [
  { match: "5 + Mega Ball", prize: "Jackpot", color: "#fbbf24" },
  { match: "5 เลข", prize: "$1,000,000", color: "#60a5fa" },
  { match: "4 + Mega Ball", prize: "$10,000", color: "#fb923c" },
  { match: "4 เลข", prize: "$500", color: "#a3a3a3" },
  { match: "3 + Mega Ball", prize: "$200", color: "#a3a3a3" },
  { match: "3 เลข", prize: "$10", color: "#a3a3a3" },
  { match: "2 + Mega Ball", prize: "$10", color: "#a3a3a3" },
  { match: "Mega Ball", prize: "$2", color: "#a3a3a3" },
]

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  await syncDraws()

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
        <p className="text-white/25 text-sm hidden sm:block">ซื้อ Powerball & Mega Millions จากไทย</p>
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

      {/* Prize tables */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4 text-center">ตารางรางวัล</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Powerball prizes */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)" }}>
              <span className="text-red-400 font-bold text-sm">🔴 Powerball</span>
              <span className="text-white/30 text-xs">$2/ใบ + ค่าบริการ</span>
            </div>
            <div className="divide-y divide-white/5">
              {PB_PRIZES.map((p) => (
                <div key={p.match} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-white/60">{p.match}</span>
                  <span className="font-bold" style={{ color: p.color }}>{p.prize}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Mega Millions prizes */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(59,130,246,0.1)" }}>
              <span className="text-blue-400 font-bold text-sm">🔵 Mega Millions</span>
              <span className="text-white/30 text-xs">$2/ใบ + ค่าบริการ</span>
            </div>
            <div className="divide-y divide-white/5">
              {MM_PRIZES.map((p) => (
                <div key={p.match} className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-white/60">{p.match}</span>
                  <span className="font-bold" style={{ color: p.color }}>{p.prize}</span>
                </div>
              ))}
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
