import Image from "next/image"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { syncUpcomingDraws } from "@/lib/draw-schedule"
import { HomeDrawCountdown } from "@/components/home/HomeDrawCountdown"
import { authOptions } from "@/lib/auth"
import LogoutButton from "@/components/shared/LogoutButton"

export const dynamic = "force-dynamic"

function pickDraw(
  draws: { type: string; jackpot: string | null; drawDate: Date }[],
  type: string
) {
  return draws.find((draw) => draw.type === type) ?? null
}

function formatJackpotUsd(value: string | null) {
  if (!value) return "USD กำลังอัปเดต"
  return value.startsWith("$") ? `USD ${value.slice(1)}` : `USD ${value}`
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) {
    await syncUpcomingDraws(prisma)
  }

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const powerballDraw = pickDraw(draws, "POWERBALL")
  const megaBallDraw = pickDraw(draws, "MEGA_MILLIONS")
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
            <div className="flex items-center gap-3 text-sm font-semibold">
              {isCustomer ? (
                <>
                  <Link href="/dashboard" className="text-slate-700 transition hover:text-slate-950">
                    {session.user.name}
                  </Link>
                  <LogoutButton
                    redirectTo="/"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-slate-500 transition hover:text-slate-950">
                    Login
                  </Link>
                  <Link href="/register" className="text-slate-500 transition hover:text-slate-950">
                    Register
                  </Link>
                </>
              )}
              <Link href="/admin-login" className="text-slate-500 transition hover:text-slate-950">
                Admin
              </Link>
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

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Link
                  href={lotteryHref}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-500">Power Ball</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    ไปหน้าซื้อหวย
                  </p>
                </Link>
                <Link
                  href={megaHref}
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-500">Mega Ball</p>
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
                  <p className="text-sm font-semibold text-slate-500">Power Ball</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatJackpotUsd(powerballDraw?.jackpot ?? null)}
                  </p>
                  <HomeDrawCountdown drawDate={powerballDraw?.drawDate.toISOString() ?? null} />
                </div>
                <div className="rounded-2xl bg-white p-5 text-center">
                  <p className="text-sm font-semibold text-slate-500">Mega Ball</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatJackpotUsd(megaBallDraw?.jackpot ?? null)}
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
