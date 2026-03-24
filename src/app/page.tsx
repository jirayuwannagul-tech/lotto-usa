import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LotterySection } from "@/components/customer/LotterySection"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", ...opts })
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) {
    await syncUpcomingDraws(prisma)
  }

  const draws = await prisma.draw.findMany({ where: { isOpen: true }, orderBy: { drawDate: "asc" } })

  const enriched = draws.map((d) => ({
    id: d.id, type: d.type,
    drawDate: d.drawDate.toISOString(),
    cutoffAt: d.cutoffAt.toISOString(),
    jackpot: d.jackpot,
    drawDateThai: fmt(d.drawDate, { weekday: "long", day: "numeric", month: "long" }),
    drawTimeThai: fmt(d.drawDate, { hour: "2-digit", minute: "2-digit" }),
    cutoffDateThai: fmt(d.cutoffAt, { weekday: "short", day: "numeric", month: "short" }),
    cutoffTimeThai: fmt(d.cutoffAt, { hour: "2-digit", minute: "2-digit" }),
  }))

  const pb = enriched.find(d => d.type === "POWERBALL")
  const mm = enriched.find(d => d.type === "MEGA_MILLIONS")

  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff1430 = new Date(thaiNow); cutoff1430.setHours(14, 30, 0, 0)
  const todayDraw = draws.find((d) => {
    const dt = new Date(d.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    return dt.getFullYear() === thaiNow.getFullYear() && dt.getMonth() === thaiNow.getMonth() && dt.getDate() === thaiNow.getDate()
  })

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#06001a 0%,#0a0028 40%,#030012 100%)" }}>

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)" }} />
        <div className="absolute top-[200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-15" style={{ background: "radial-gradient(circle,#2563eb,transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/2 w-[800px] h-[400px] -translate-x-1/2 opacity-10" style={{ background: "radial-gradient(ellipse,#c9a84c,transparent 70%)" }} />
      </div>

      {/* NAV */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>🎱</div>
          <span className="font-black text-xl tracking-wide" style={{ background: "linear-gradient(90deg,#a78bfa,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LottoUSA</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#buy" className="text-white/60 hover:text-white text-sm transition">ซื้อหวย</a>
          <a href="#how" className="text-white/60 hover:text-white text-sm transition">วิธีการ</a>
          <a href="/admin" className="text-white/20 hover:text-white/50 text-xs transition">Admin</a>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="px-5 py-2 rounded-full text-sm font-semibold transition" style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)" }}>
              Dashboard →
            </Link>
          ) : (
            <>
              <a href="#buy" className="text-white/60 hover:text-white text-sm transition hidden sm:block">เข้าสู่ระบบ</a>
              <Link href="/register" className="px-5 py-2 rounded-full text-sm font-semibold text-white transition" style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)" }}>
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* TODAY BANNER */}
      {todayDraw && (
        <div className="relative z-10 max-w-7xl mx-auto px-6 mb-2">
          <div className="rounded-xl px-5 py-2.5 text-center text-sm font-medium"
            style={{
              background: thaiNow >= cutoff1430 ? "rgba(16,185,129,0.12)" : "rgba(234,179,8,0.12)",
              border: `1px solid ${thaiNow >= cutoff1430 ? "rgba(16,185,129,0.3)" : "rgba(234,179,8,0.3)"}`,
            }}>
            {thaiNow >= cutoff1430
              ? <span className="text-emerald-400">✅ วันนี้ <strong>{todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัลแล้ว</span>
              : <span className="text-yellow-400">⚡ วันนี้มี <strong>{todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}</strong> ออกรางวัล — รอผลหลัง 14:30 น.</span>}
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }}>
            🇺🇸 หวยอเมริกาอันดับ 1
          </div>
          <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-4">
            ซื้อหวย
            <span className="block" style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>อเมริกา</span>
            จากไทยได้เลย
          </h1>
          <p className="text-white/50 text-lg mb-8 leading-relaxed">
            Powerball & Mega Millions รางวัลใหญ่ระดับพันล้าน<br />สั่งซื้อออนไลน์ รับตั๋วจริง จ่ายเงินบาท
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#buy" className="px-7 py-3 rounded-full font-bold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}>
              ซื้อเลย →
            </a>
            <a href="#how" className="px-7 py-3 rounded-full font-semibold text-white/70 hover:text-white transition"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              วิธีการสั่งซื้อ
            </a>
          </div>
        </div>

        {/* Right — Jackpot cards */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05))", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 40px rgba(239,68,68,0.1)" }}>
            <div className="flex items-center gap-4">
              <Image src="/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png" alt="Powerball" width={110} height={44} className="object-contain" />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest">Jackpot</p>
                <p className="font-black text-4xl" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {pb?.jackpot ?? "—"}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-white/30 text-xs">ออกรางวัล</p>
              <p className="text-white text-sm font-semibold">{pb?.drawDateThai ?? "—"}</p>
              <p className="text-red-400 font-bold">{pb?.drawTimeThai ?? ""} น.</p>
            </div>
          </div>

          <div className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 0 40px rgba(59,130,246,0.1)" }}>
            <div className="flex items-center gap-4">
              <Image src="/273-2730781_mega-millions-logo-png.png" alt="Mega Millions" width={110} height={44} className="object-contain" />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest">Jackpot</p>
                <p className="font-black text-4xl" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {mm?.jackpot ?? "—"}
                </p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-white/30 text-xs">ออกรางวัล</p>
              <p className="text-white text-sm font-semibold">{mm?.drawDateThai ?? "—"}</p>
              <p className="text-blue-400 font-bold">{mm?.drawTimeThai ?? ""} น.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="how" className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <p className="text-center text-white/40 text-xs uppercase tracking-widest mb-8">ทำไมต้อง LottoUSA</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🔒", title: "ปลอดภัย 100%", desc: "ระบบชำระเงินผ่านธนาคารไทย ตั๋วจริงส่งให้ทุกใบ" },
            { icon: "⚡", title: "ผลออกทันที", desc: "แจ้งผลอัตโนมัติทุกงวด ทราบผลภายใน 14:30 น." },
            { icon: "💰", title: "รับรางวัลครบ", desc: "ดำเนินการรับรางวัลให้ทุกขั้นตอน หักค่าบริการเพียง 10%" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6 text-center transition hover:border-purple-500/40"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BUY SECTION */}
      <section id="buy" className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">เลือกเลขได้เลย</p>
          <h2 className="text-3xl font-black text-white">งวดที่เปิดรับตอนนี้</h2>
        </div>
        <LotterySection draws={enriched} isLoggedIn={!!session} />
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="text-white/15 text-xs">© 2026 LottoUSA · ซื้อหวยอเมริกาจากไทย</p>
      </footer>
    </div>
  )
}
