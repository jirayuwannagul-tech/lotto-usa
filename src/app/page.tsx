import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import LoginForm from "@/components/shared/LoginForm"
import { DrawCard } from "@/components/customer/DrawCard"

// Auto-sync: create upcoming draws if missing, close expired ones
async function syncDraws() {
  const SCHEDULE = {
    POWERBALL:     { days: [1, 3, 6], hourET: 22, minET: 59 },
    MEGA_MILLIONS: { days: [2, 5],    hourET: 23, minET: 0  },
  }
  const ET_OFFSET = 4
  const now = new Date()
  const nowET = new Date(now.getTime() - ET_OFFSET * 3600000)

  for (const [type, s] of Object.entries(SCHEDULE) as [keyof typeof SCHEDULE, typeof SCHEDULE[keyof typeof SCHEDULE]][]) {
    for (let i = 0; i <= 7; i++) {
      const d = new Date(nowET)
      d.setUTCDate(nowET.getUTCDate() + i)
      if (!s.days.includes(d.getUTCDay())) continue
      const drawUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), s.hourET + ET_OFFSET, s.minET))
      const cutoffUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 0))
      if (cutoffUTC <= now) continue
      const exists = await prisma.draw.findFirst({ where: { type, drawDate: drawUTC } })
      if (!exists) await prisma.draw.create({ data: { type, drawDate: drawUTC, cutoffAt: cutoffUTC } })
      break
    }
  }
  // Auto-close expired
  await prisma.draw.updateMany({ where: { isOpen: true, cutoffAt: { lt: now } }, data: { isOpen: false } })
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "long", day: "numeric", month: "long" })
}
function fmtTime(date: Date) {
  return date.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
}

function getTodayBanner(draws: { type: string; drawDate: Date }[]) {
  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff = new Date(thaiNow); cutoff.setHours(14, 30, 0, 0)
  for (const draw of draws) {
    const dt = new Date(draw.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    const same = dt.getFullYear() === thaiNow.getFullYear() && dt.getMonth() === thaiNow.getMonth() && dt.getDate() === thaiNow.getDate()
    if (same) return { type: draw.type, done: thaiNow >= cutoff }
  }
  return null
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  await syncDraws()

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const powerball = draws.find((d) => d.type === "POWERBALL")
  const megaMillions = draws.find((d) => d.type === "MEGA_MILLIONS")
  const banner = getTodayBanner(draws)
  const isLoggedIn = !!session

  return (
    <div className="min-h-screen text-white" style={{ background: "radial-gradient(ellipse at 20% 50%, #0d1b3e 0%, #050a14 60%, #0a0a0a 100%)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-20" style={{ background: "radial-gradient(ellipse, #c9a84c 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #c9a84c, #f5d485)" }}>🎱</div>
          <span className="font-black text-xl tracking-wide" style={{ background: "linear-gradient(90deg, #f5d485, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LottoUSA</span>
        </div>
        <p className="text-white/30 text-sm hidden sm:block">ซื้อ Powerball & Mega Millions จากไทย</p>
      </header>

      {/* Today banner */}
      {banner && (
        <div className="relative z-10 mx-4 sm:mx-6 mb-4 rounded-xl px-5 py-3 text-center text-sm font-medium"
          style={{
            background: banner.done ? "linear-gradient(90deg,rgba(16,185,129,.2),rgba(16,185,129,.1))" : "linear-gradient(90deg,rgba(234,179,8,.2),rgba(234,179,8,.1))",
            border: `1px solid ${banner.done ? "rgba(16,185,129,.4)" : "rgba(234,179,8,.4)"}`,
          }}>
          {banner.done
            ? <span className="text-emerald-400">✅ วันนี้ <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัลแล้ว</span>
            : <span className="text-yellow-400">⚡ วันนี้มี <strong>{banner.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัล — รอผลหลัง 14:30 น.</span>
          }
        </div>
      )}

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left — Draw cards with number pickers */}
          <div className="lg:col-span-3 space-y-5">
            {powerball ? (
              <DrawCard
                draw={{ ...powerball, drawDate: powerball.drawDate.toISOString(), cutoffAt: powerball.cutoffAt.toISOString() }}
                isLoggedIn={isLoggedIn}
                drawDateThai={fmtDate(powerball.drawDate)}
                drawTimeThai={fmtTime(powerball.drawDate)}
                cutoffDateThai={fmtDate(powerball.cutoffAt)}
                cutoffTimeThai={fmtTime(powerball.cutoffAt)}
              />
            ) : (
              <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Image src="/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png" alt="Powerball" width={130} height={50} className="object-contain mx-auto mb-3 opacity-40" />
                <p className="text-white/25 text-sm">Powerball — ยังไม่มีงวดที่เปิดรับ</p>
              </div>
            )}

            {megaMillions ? (
              <DrawCard
                draw={{ ...megaMillions, drawDate: megaMillions.drawDate.toISOString(), cutoffAt: megaMillions.cutoffAt.toISOString() }}
                isLoggedIn={isLoggedIn}
                drawDateThai={fmtDate(megaMillions.drawDate)}
                drawTimeThai={fmtTime(megaMillions.drawDate)}
                cutoffDateThai={fmtDate(megaMillions.cutoffAt)}
                cutoffTimeThai={fmtTime(megaMillions.cutoffAt)}
              />
            ) : (
              <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Image src="/273-2730781_mega-millions-logo-png.png" alt="Mega Millions" width={130} height={50} className="object-contain mx-auto mb-3 opacity-40" />
                <p className="text-white/25 text-sm">Mega Millions — ยังไม่มีงวดที่เปิดรับ</p>
              </div>
            )}
          </div>

          {/* Right — Login or account */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl p-[1px] sticky top-6" style={{ background: "linear-gradient(135deg,rgba(201,168,76,.5),rgba(255,255,255,.05),rgba(201,168,76,.2))" }}>
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(160deg,rgba(15,12,30,.97),rgba(10,8,20,.95))" }}>
                {session ? (
                  <div className="text-center space-y-4">
                    <p className="text-white/40 text-sm">ยินดีต้อนรับกลับ</p>
                    <p className="font-bold text-xl" style={{ background: "linear-gradient(90deg,#f5d485,#c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{session.user.name}</p>
                    <Link href="/dashboard" className="block w-full py-3 rounded-xl font-semibold text-slate-900 text-center hover:opacity-90 transition" style={{ background: "linear-gradient(90deg,#f5d485,#c9a84c)" }}>
                      ไปที่ Dashboard →
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="font-black text-xl" style={{ background: "linear-gradient(90deg,#f5d485,#c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>เข้าสู่ระบบ</h3>
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

      <footer className="relative z-10 text-center pb-8">
        <p className="text-white/15 text-xs">© 2026 LottoUSA · ซื้อหวยอเมริกาจากไทย</p>
      </footer>
    </div>
  )
}
