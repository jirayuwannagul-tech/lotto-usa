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
  const [powerballDraw, megaBallDraw] = await Promise.all([
    getPurchasableDraw(prisma, "POWERBALL"),
    getPurchasableDraw(prisma, "MEGA_MILLIONS"),
  ])
  const isCustomer = session?.user?.role === "CUSTOMER"
  const isAdmin = session?.user?.role === "ADMIN"
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
              ) : isAdmin ? (
                <LogoutButton
                  redirectTo="/"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                />
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
      </main>
    </div>
  )
}
