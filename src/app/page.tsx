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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/lotto-usa-logo.png"
                alt="LottoUSA"
                width={1240}
                height={404}
                className="h-auto w-[28rem] sm:w-[34rem] lg:w-[52rem]"
                priority
                unoptimized
              />
            </Link>
            <div className="text-sm font-semibold">
              {isCustomer ? (
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <Link
                      href="/dashboard"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      Dashboard
                    </Link>
                    <LogoutButton
                      redirectTo="/"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                    />
                  </div>
                  {session?.user?.name ? (
                    <p className="mt-2 text-sm font-medium text-slate-500">{session.user.name}</p>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-slate-500 transition hover:text-slate-950">
                    Login
                  </Link>
                  <Link href="/register" className="text-slate-500 transition hover:text-slate-950">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">บริการหวยอเมริกา</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                เว็บนี้ใช้สำหรับซื้อหวยอเมริกา
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                ตอนนี้รองรับการซื้อ Power Ball และ Mega Ball โดยจะแยก flow การใช้งานออกเป็นขั้นตอนถัดไป
                ตามที่กำหนดภายหลัง
              </p>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">AMERICA / LAX</p>
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">Power Ball:</p>
                    <span className={getSalesDayBadge("Power Ball")}>
                      ออเดอร์ใหม่จะเข้ารอบ {formatThaiDraw(powerballDraw?.drawDate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">Mega Ball:</p>
                    <span className={getSalesDayBadge("Mega Ball")}>
                      ออเดอร์ใหม่จะเข้ารอบ {formatThaiDraw(megaBallDraw?.drawDate)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  ระบบเปิดรับคำสั่งซื้อตลอดเวลา และจะคำนวณให้อัตโนมัติว่าออเดอร์ใหม่เข้ารอบงวดไหนตามเวลา
                  อเมริกา
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Link
                  href={lotteryHref}
                  className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center transition hover:border-rose-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-rose-600">Power Ball</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    ไปหน้าซื้อหวย
                  </p>
                </Link>
                <Link
                  href={megaHref}
                  className="rounded-3xl border border-sky-200 bg-sky-50 px-6 py-8 text-center transition hover:border-sky-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-sky-600">Mega Ball</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    ไปหน้าซื้อหวย
                  </p>
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-center text-xs font-semibold tracking-[0.22em] text-slate-400">
                สรุปรางวัลใหญ่
              </p>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-white p-5 text-center">
                  <p className="text-sm font-semibold text-rose-600">Power Ball</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatJackpotUsd(powerballDraw?.jackpot ?? null)}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    ออเดอร์ใหม่จะเข้ารอบ: {formatThaiDraw(powerballDraw?.drawDate)}
                  </p>
                  <HomeDrawCountdown drawDate={powerballDraw?.drawDate.toISOString() ?? null} />
                </div>
                <div className="rounded-2xl bg-white p-5 text-center">
                  <p className="text-sm font-semibold text-sky-600">Mega Ball</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatJackpotUsd(megaBallDraw?.jackpot ?? null)}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    ออเดอร์ใหม่จะเข้ารอบ: {formatThaiDraw(megaBallDraw?.drawDate)}
                  </p>
                  <HomeDrawCountdown drawDate={megaBallDraw?.drawDate.toISOString() ?? null} />
                </div>
              </div>
            </aside>
          </div>
        </section>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">วิธีถูกรางวัล</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">รางวัลมีกี่ระดับ?</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {/* Powerball */}
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-600 mb-4">Power Ball — เลือก 5 + 1</p>
              <div className="space-y-2 text-sm">
                {[
                  { match: "5 + PB", prize: "Jackpot", highlight: true },
                  { match: "5", prize: "$1,000,000" },
                  { match: "4 + PB", prize: "$50,000" },
                  { match: "4", prize: "$100" },
                  { match: "3 + PB", prize: "$100" },
                  { match: "3", prize: "$7" },
                  { match: "2 + PB", prize: "$7" },
                  { match: "1 + PB", prize: "$4" },
                  { match: "PB เท่านั้น", prize: "$4" },
                ].map((row) => (
                  <div key={row.match} className={`flex justify-between rounded-xl px-3 py-2 ${row.highlight ? "bg-rose-500 text-white font-bold" : "bg-white text-slate-700"}`}>
                    <span>ถูก {row.match}</span>
                    <span className={row.highlight ? "text-white" : "font-semibold text-rose-600"}>{row.prize}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Mega Millions */}
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-sm font-semibold text-sky-600 mb-4">Mega Millions — เลือก 5 + 1</p>
              <div className="space-y-2 text-sm">
                {[
                  { match: "5 + MB", prize: "Jackpot", highlight: true },
                  { match: "5", prize: "$1,000,000" },
                  { match: "4 + MB", prize: "$10,000" },
                  { match: "4", prize: "$500" },
                  { match: "3 + MB", prize: "$200" },
                  { match: "3", prize: "$10" },
                  { match: "2 + MB", prize: "$10" },
                  { match: "1 + MB", prize: "$4" },
                  { match: "MB เท่านั้น", prize: "$2" },
                ].map((row) => (
                  <div key={row.match} className={`flex justify-between rounded-xl px-3 py-2 ${row.highlight ? "bg-sky-500 text-white font-bold" : "bg-white text-slate-700"}`}>
                    <span>ถูก {row.match}</span>
                    <span className={row.highlight ? "text-white" : "font-semibold text-sky-600"}>{row.prize}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400 text-center">PB = Powerball · MB = Mega Ball · รางวัลเป็นอัตราก่อนหักภาษี</p>
        </section>

        {recentDraws.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">ผลรางวัลล่าสุด</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">ผลการออกรางวัล</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentDraws.map((draw) => {
                const isPB = draw.type === "POWERBALL"
                const drawDateThai = draw.drawDate.toLocaleDateString("th-TH", {
                  timeZone: "Asia/Bangkok",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })
                const drawTimeThai = draw.drawDate.toLocaleTimeString("th-TH", {
                  timeZone: "Asia/Bangkok",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                const hasResult = draw.winningMain && draw.winningSpecial
                return (
                  <div key={draw.id} className={`rounded-2xl border p-5 ${isPB ? "border-rose-100 bg-rose-50" : "border-sky-100 bg-sky-50"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-sm font-semibold ${isPB ? "text-rose-600" : "text-sky-600"}`}>
                        {isPB ? "Power Ball" : "Mega Ball"}
                      </p>
                      <p className="text-xs text-slate-400">{drawDateThai} {drawTimeThai} น.</p>
                    </div>
                    {hasResult ? (
                      <>
                        <p className="text-xs font-semibold tracking-widest text-slate-400 mb-2">เลขที่ออก</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          {draw.winningMain!.split(",").map((n, i) => (
                            <span key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPB ? "bg-rose-500" : "bg-sky-500"}`}>
                              {n.trim()}
                            </span>
                          ))}
                          <span className="mx-1 text-slate-300">+</span>
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${isPB ? "bg-amber-500" : "bg-amber-500"}`}>
                            {draw.winningSpecial!.trim()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <p className="text-sm">รอประกาศผลรางวัล</p>
                      </div>
                    )}
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
