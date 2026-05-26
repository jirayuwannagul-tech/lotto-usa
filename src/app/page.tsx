import Image from "next/image"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { getPurchasableDraw, syncUpcomingDraws } from "@/lib/draw-schedule"
import { HomeDrawCountdown } from "@/components/home/HomeDrawCountdown"
import { authOptions } from "@/lib/auth"
import LogoutButton from "@/components/shared/LogoutButton"

export const dynamic = "force-dynamic"

function formatJackpotUsd(value: string | null) {
  if (!value) return "USD กำลังอัปเดต"
  return value.startsWith("$") ? `USD ${value.slice(1)}` : `USD ${value}`
}

function getSalesDayBadge(drawLabel: string) {
  if (drawLabel === "Power Ball") {
    return "inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-rose-700"
  }
  if (drawLabel === "Mega Ball") {
    return "inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sky-700"
  }
  return "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-slate-700"
}

function formatThaiDraw(drawDate: Date | null | undefined) {
  if (!drawDate) return "กำลังอัปเดต"
  return new Date(drawDate).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " น."
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  await syncUpcomingDraws(prisma)
  const now = new Date()
  const [powerballDraw, megaBallDraw, recentDraws] = await Promise.all([
    getPurchasableDraw(prisma, "POWERBALL"),
    getPurchasableDraw(prisma, "MEGA_MILLIONS"),
    prisma.draw.findMany({
      where: {
        drawDate: {
          lt: now,
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
        winningMain: { not: null },
      },
      orderBy: { drawDate: "desc" },
      take: 6,
    }),
  ])
  const isCustomer = session?.user?.role === "CUSTOMER"
  const lotteryHref = isCustomer ? "/power-ball" : "/login"
  const megaHref = isCustomer ? "/mega-ball" : "/login"

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Nav */}
      <nav className="border-b border-[#c9a84c]/20 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/">
            <Image src="/lotto-usa-logo.png" alt="LottoUSA" width={1240} height={404} className="h-auto w-36 sm:w-44" priority unoptimized />
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium">
            {isCustomer ? (
              <>
                {session?.user?.name && <span className="hidden text-[#c9a84c]/70 sm:block">{session.user.name}</span>}
                <Link href="/dashboard" className="rounded-xl border border-[#c9a84c]/30 px-4 py-2 text-[#c9a84c] transition hover:border-[#c9a84c] hover:bg-[#c9a84c]/10">
                  Dashboard
                </Link>
                <LogoutButton redirectTo="/" className="rounded-xl border border-white/10 px-4 py-2 text-white/50 transition hover:border-white/20 hover:text-white" />
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-white/60 transition hover:text-white">เข้าสู่ระบบ</Link>
                <Link href="/register" className="rounded-xl bg-[#c9a84c] px-5 py-2 font-semibold text-black transition hover:bg-[#d4b860]">สมัครสมาชิก</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-6">

        {/* Hero — Jackpot */}
        <section className="relative overflow-hidden rounded-3xl border border-[#c9a84c]/20 bg-gradient-to-br from-[#111108] via-[#1a1800] to-[#0d0d0d] p-8 sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#c9a84c18,_transparent_60%)]" />
          <p className="text-xs font-semibold tracking-[0.3em] text-[#c9a84c]">LOTTO USA — บริการซื้อหวยอเมริกา</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            ลุ้นรางวัล<br />
            <span className="text-[#c9a84c]">หวยอเมริกา</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/50">
            ซื้อ Powerball และ Mega Millions ง่ายๆ จากไทย เราดูแลทุกขั้นตอนให้คุณ
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* PB jackpot */}
            <div className="col-span-1 rounded-2xl border border-[#c9a84c]/20 bg-black/40 p-5 lg:col-span-2">
              <p className="text-xs font-semibold tracking-widest text-red-400">POWERBALL</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatJackpotUsd(powerballDraw?.jackpot ?? null)}</p>
              <p className="mt-1 text-xs text-white/40">งวดถัดไป {formatThaiDraw(powerballDraw?.drawDate)}</p>
              <HomeDrawCountdown drawDate={powerballDraw?.drawDate.toISOString() ?? null} />
              <Link href={lotteryHref} className="mt-4 block rounded-xl bg-[#c9a84c] py-3 text-center text-sm font-bold text-black transition hover:bg-[#d4b860]">
                ซื้อ Powerball →
              </Link>
            </div>
            {/* MM jackpot */}
            <div className="col-span-1 rounded-2xl border border-[#c9a84c]/20 bg-black/40 p-5 lg:col-span-2">
              <p className="text-xs font-semibold tracking-widest text-blue-400">MEGA MILLIONS</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatJackpotUsd(megaBallDraw?.jackpot ?? null)}</p>
              <p className="mt-1 text-xs text-white/40">งวดถัดไป {formatThaiDraw(megaBallDraw?.drawDate)}</p>
              <HomeDrawCountdown drawDate={megaBallDraw?.drawDate.toISOString() ?? null} />
              <Link href={megaHref} className="mt-4 block rounded-xl border border-[#c9a84c] py-3 text-center text-sm font-bold text-[#c9a84c] transition hover:bg-[#c9a84c]/10">
                ซื้อ Mega Millions →
              </Link>
            </div>
          </div>
        </section>

        {/* Prize tiers */}
        <section className="mt-6 rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-7 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#c9a84c]">PRIZE STRUCTURE</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">ระดับรางวัลทั้งหมด</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              {
                label: "Powerball", sub: "เลือก 5 เลข + 1 Powerball", color: "text-red-400", border: "border-red-900/40",
                rows: [
                  { match: "5 + PB", prize: "Jackpot", gold: true },
                  { match: "5", prize: "$1,000,000" },
                  { match: "4 + PB", prize: "$50,000" },
                  { match: "4", prize: "$100" },
                  { match: "3 + PB", prize: "$100" },
                  { match: "3", prize: "$7" },
                  { match: "2 + PB", prize: "$7" },
                  { match: "1 + PB", prize: "$4" },
                  { match: "PB เท่านั้น", prize: "$4" },
                ],
              },
              {
                label: "Mega Millions", sub: "เลือก 5 เลข + 1 Mega Ball", color: "text-blue-400", border: "border-blue-900/40",
                rows: [
                  { match: "5 + MB", prize: "Jackpot", gold: true },
                  { match: "5", prize: "$1,000,000" },
                  { match: "4 + MB", prize: "$10,000" },
                  { match: "4", prize: "$500" },
                  { match: "3 + MB", prize: "$200" },
                  { match: "3", prize: "$10" },
                  { match: "2 + MB", prize: "$10" },
                  { match: "1 + MB", prize: "$4" },
                  { match: "MB เท่านั้น", prize: "$2" },
                ],
              },
            ].map((game) => (
              <div key={game.label} className={`rounded-2xl border ${game.border} bg-[#111] p-5`}>
                <p className={`text-sm font-bold ${game.color}`}>{game.label}</p>
                <p className="mb-4 text-xs text-white/40">{game.sub}</p>
                <div className="space-y-1.5">
                  {game.rows.map((row) => (
                    <div key={row.match} className={`flex justify-between rounded-xl px-3 py-2 text-sm ${row.gold ? "bg-[#c9a84c] font-bold text-black" : "bg-white/5 text-white/70"}`}>
                      <span>ถูก {row.match}</span>
                      <span className={row.gold ? "text-black" : "font-semibold text-[#c9a84c]"}>{row.prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/30">รางวัลเป็นอัตราก่อนหักภาษีสหรัฐฯ · PB = Powerball · MB = Mega Ball</p>
        </section>

        {/* Draw results */}
        {recentDraws.length > 0 && (
          <section className="mt-6 rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-7 sm:p-10">
            <p className="text-xs font-semibold tracking-[0.3em] text-[#c9a84c]">LATEST RESULTS</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">ผลรางวัลล่าสุด</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentDraws.map((draw) => {
                const isPB = draw.type === "POWERBALL"
                const drawDateThai = draw.drawDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", year: "2-digit" })
                return (
                  <div key={draw.id} className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-bold tracking-widest ${isPB ? "text-red-400" : "text-blue-400"}`}>{isPB ? "POWERBALL" : "MEGA MILLIONS"}</span>
                      <span className="text-xs text-white/30">{drawDateThai}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {draw.winningMain!.split(",").map((n, i) => (
                        <span key={i} className="w-9 h-9 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 flex items-center justify-center text-sm font-bold text-[#c9a84c]">
                          {n.trim()}
                        </span>
                      ))}
                      <span className="text-white/20">+</span>
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPB ? "bg-red-600" : "bg-blue-600"}`}>
                        {draw.winningSpecial!.trim()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
