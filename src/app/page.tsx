import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

export const dynamic = "force-dynamic"

function pickJackpot(draws: { type: string; jackpot: string | null }[], type: string) {
  return draws.find((draw) => draw.type === type)?.jackpot ?? "กำลังอัปเดต"
}

export default async function Home() {
  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) {
    await syncUpcomingDraws(prisma)
  }

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const powerballJackpot = pickJackpot(draws, "POWERBALL")
  const megaBallJackpot = pickJackpot(draws, "MEGA_MILLIONS")

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold tracking-tight text-slate-950">LottoUSA</p>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Link href="/login" className="text-slate-500 transition hover:text-slate-950">
                Login
              </Link>
              <Link href="/register" className="text-slate-500 transition hover:text-slate-950">
                Register
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
                  href="/power-ball"
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-500">Power Ball</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    ไปหน้าซื้อหวย
                  </p>
                </Link>
                <Link
                  href="/mega-ball"
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
                    {powerballJackpot}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-5 text-center">
                  <p className="text-sm font-semibold text-slate-500">Mega Ball</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {megaBallJackpot}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
