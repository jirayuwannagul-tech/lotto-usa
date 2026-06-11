import Image from "next/image"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { getPurchasableDraw, syncUpcomingDraws } from "@/lib/draw-schedule"
import { CutoffBadge } from "@/components/home/CutoffBadge"
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

interface LiveResult {
  type: "POWERBALL" | "MEGA_MILLIONS"
  date: string
  mainNumbers: string
  specialNumber: string
}

async function fetchLiveResults(): Promise<LiveResult[]> {
  try {
    const [pbRes, mmRes] = await Promise.all([
      fetch("https://data.ny.gov/resource/d6yy-54nr.json?$limit=3&$order=draw_date+DESC", { cache: "no-store" }),
      fetch("https://data.ny.gov/resource/5xaw-6ayf.json?$limit=3&$order=draw_date+DESC", { cache: "no-store" }),
    ])
    const pbData = pbRes.ok ? (await pbRes.json() as { draw_date: string; winning_numbers: string }[]) : []
    const mmData = mmRes.ok ? (await mmRes.json() as { draw_date: string; winning_numbers: string; mega_ball: string }[]) : []
    const pb = pbData.map((row) => {
      const nums = row.winning_numbers.trim().split(" ")
      const pb = nums.pop()!
      return { type: "POWERBALL" as const, date: row.draw_date, mainNumbers: nums.map((n) => n.padStart(2, "0")).join(","), specialNumber: pb.padStart(2, "0") }
    })
    const mm = mmData.map((row) => ({
      type: "MEGA_MILLIONS" as const,
      date: row.draw_date,
      mainNumbers: row.winning_numbers.trim().split(" ").map((n) => n.padStart(2, "0")).join(","),
      specialNumber: row.mega_ball.padStart(2, "0"),
    }))
    return [...pb, ...mm]
  } catch {
    return []
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  await syncUpcomingDraws(prisma)
  const [powerballDraw, megaBallDraw, liveResults] = await Promise.all([
    getPurchasableDraw(prisma, "POWERBALL"),
    getPurchasableDraw(prisma, "MEGA_MILLIONS"),
    fetchLiveResults(),
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
              <p className="mt-1 text-xs text-white/40">ออกรางวัล {formatThaiDraw(powerballDraw?.drawDate)}</p>
              {powerballDraw && (
                <CutoffBadge
                  cutoffAt={powerballDraw.cutoffAt.toISOString()}
                  drawDate={powerballDraw.drawDate.toISOString()}
                  drawLabel="Powerball"
                />
              )}
              <Link href={lotteryHref} className="mt-4 block rounded-xl bg-[#c9a84c] py-3 text-center text-sm font-bold text-black transition hover:bg-[#d4b860]">
                ซื้อ Powerball →
              </Link>
            </div>
            {/* MM jackpot */}
            <div className="col-span-1 rounded-2xl border border-[#c9a84c]/20 bg-black/40 p-5 lg:col-span-2">
              <p className="text-xs font-semibold tracking-widest text-blue-400">MEGA MILLIONS</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatJackpotUsd(megaBallDraw?.jackpot ?? null)}</p>
              <p className="mt-1 text-xs text-white/40">ออกรางวัล {formatThaiDraw(megaBallDraw?.drawDate)}</p>
              {megaBallDraw && (
                <CutoffBadge
                  cutoffAt={megaBallDraw.cutoffAt.toISOString()}
                  drawDate={megaBallDraw.drawDate.toISOString()}
                  drawLabel="Mega Millions"
                />
              )}
              <Link href={megaHref} className="mt-4 block rounded-xl border border-[#c9a84c] py-3 text-center text-sm font-bold text-[#c9a84c] transition hover:bg-[#c9a84c]/10">
                ซื้อ Mega Millions →
              </Link>
            </div>
          </div>
        </section>

        {/* Draw results — always shown, live from NY Open Data */}
        <section className="mt-6 rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-7 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#c9a84c]">LATEST RESULTS</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">ประกาศผลรางวัล</h2>
          {liveResults.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveResults.map((result, idx) => {
                const isPB = result.type === "POWERBALL"
                const drawDateThai = new Date(result.date).toLocaleDateString("th-TH", {
                  timeZone: "UTC",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })
                return (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-[#111] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-bold tracking-widest ${isPB ? "text-red-400" : "text-blue-400"}`}>
                        {isPB ? "POWERBALL" : "MEGA MILLIONS"}
                      </span>
                      <span className="text-xs text-white/30">{drawDateThai}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {result.mainNumbers.split(",").map((n, i) => (
                        <span key={i} className="w-9 h-9 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 flex items-center justify-center text-sm font-bold text-[#c9a84c]">
                          {n.trim()}
                        </span>
                      ))}
                      <span className="text-white/20">+</span>
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPB ? "bg-red-600" : "bg-blue-600"}`}>
                        {result.specialNumber.trim()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "POWERBALL", color: "text-red-400", border: "border-red-900/30", draw: powerballDraw },
                { label: "MEGA MILLIONS", color: "text-blue-400", border: "border-blue-900/30", draw: megaBallDraw },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl border ${item.border} bg-[#111] p-6`}>
                  <p className={`text-xs font-bold tracking-widest ${item.color}`}>{item.label}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-sm text-white/50">กำลังโหลดผลรางวัล...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prize tiers */}
        <section className="mt-6 rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-7 sm:p-10">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#c9a84c]">PRIZE STRUCTURE</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">ระดับรางวัลทั้งหมด</h2>
          <p className="mt-1 text-sm text-white/40">ตัวอย่าง: ซื้อเลข 7 · 14 · 21 · 35 · 52 + PB 10</p>

          {/* Example balls */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["7","14","21","35","52"].map((n) => (
              <span key={n} className="w-10 h-10 rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/10 flex items-center justify-center text-sm font-bold text-[#c9a84c]">{n}</span>
            ))}
            <span className="text-white/30 text-lg">+</span>
            <span className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold text-white">10</span>
            <span className="ml-2 text-xs text-white/30">← ตัวแดง = Powerball</span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {[
              {
                label: "Powerball", color: "text-red-400", border: "border-red-900/40", ballColor: "bg-red-600", ballLabel: "PB",
                rows: [
                  { desc: "ถูกทั้ง 5 เลข + Powerball", prize: "Jackpot", gold: true },
                  { desc: "ถูกทั้ง 5 เลข (ไม่มี PB)", prize: "$1,000,000" },
                  { desc: "ถูก 4 เลข + Powerball", prize: "$50,000" },
                  { desc: "ถูก 4 เลข (ไม่มี PB)", prize: "$100" },
                  { desc: "ถูก 3 เลข + Powerball", prize: "$100" },
                  { desc: "ถูก 3 เลข (ไม่มี PB)", prize: "$7" },
                  { desc: "ถูก 2 เลข + Powerball", prize: "$7" },
                  { desc: "ถูก 1 เลข + Powerball", prize: "$4" },
                  { desc: "ถูกแค่ Powerball อย่างเดียว", prize: "$4" },
                ],
              },
              {
                label: "Mega Millions", color: "text-blue-400", border: "border-blue-900/40", ballColor: "bg-blue-600", ballLabel: "MB",
                rows: [
                  { desc: "ถูกทั้ง 5 เลข + Mega Ball", prize: "Jackpot", gold: true },
                  { desc: "ถูกทั้ง 5 เลข (ไม่มี MB)", prize: "$1,000,000" },
                  { desc: "ถูก 4 เลข + Mega Ball", prize: "$10,000" },
                  { desc: "ถูก 4 เลข (ไม่มี MB)", prize: "$500" },
                  { desc: "ถูก 3 เลข + Mega Ball", prize: "$200" },
                  { desc: "ถูก 3 เลข (ไม่มี MB)", prize: "$10" },
                  { desc: "ถูก 2 เลข + Mega Ball", prize: "$10" },
                  { desc: "ถูก 1 เลข + Mega Ball", prize: "$4" },
                  { desc: "ถูกแค่ Mega Ball อย่างเดียว", prize: "$2" },
                ],
              },
            ].map((game) => (
              <div key={game.label} className={`rounded-2xl border ${game.border} bg-[#111] p-5`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-6 h-6 rounded-full ${game.ballColor} flex items-center justify-center text-[10px] font-bold text-white`}>{game.ballLabel}</span>
                  <p className={`text-sm font-bold ${game.color}`}>{game.label}</p>
                </div>
                <p className="mb-4 text-xs text-white/30">เลือก 5 เลขหลัก (1–69) + 1 {game.ballLabel} (1–26)</p>
                <div className="space-y-1.5">
                  {game.rows.map((row) => (
                    <div key={row.desc} className={`flex justify-between gap-3 rounded-xl px-3 py-2 text-sm ${row.gold ? "bg-[#c9a84c] font-bold text-black" : "bg-white/5 text-white/70"}`}>
                      <span>{row.desc}</span>
                      <span className={`shrink-0 ${row.gold ? "text-black" : "font-semibold text-[#c9a84c]"}`}>{row.prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/30">
            รางวัลเป็นอัตราก่อนหักภาษีสหรัฐฯ —{" "}
            <Link href="/prize-policy" className="underline underline-offset-2 hover:text-white/60 transition">
              อ่านนโยบายการรับรางวัล
            </Link>
          </p>
        </section>

      </main>
    </div>
  )
}
