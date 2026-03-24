import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, CircleUserRound } from "lucide-react"
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

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const enriched = draws.map((draw) => ({
    id: draw.id,
    type: draw.type,
    drawDate: draw.drawDate.toISOString(),
    cutoffAt: draw.cutoffAt.toISOString(),
    jackpot: draw.jackpot,
    drawDateThai: fmt(draw.drawDate, { weekday: "long", day: "numeric", month: "long" }),
    drawTimeThai: fmt(draw.drawDate, { hour: "2-digit", minute: "2-digit" }),
    cutoffDateThai: fmt(draw.cutoffAt, { weekday: "short", day: "numeric", month: "short" }),
    cutoffTimeThai: fmt(draw.cutoffAt, { hour: "2-digit", minute: "2-digit" }),
  }))

  const openDraws = enriched.filter((draw) =>
    draw.type === "POWERBALL" || draw.type === "MEGA_MILLIONS"
  )
  const strongestJackpot = openDraws.map((draw) => draw.jackpot).find(Boolean) ?? "Updating"
  const nextDraw = openDraws[0]

  const steps = [
    {
      number: "1",
      title: "Choose a game",
      description: "Open Powerball or Mega Millions and check the draw date before you start.",
    },
    {
      number: "2",
      title: "Pick your numbers",
      description: "Select your numbers manually or use Quick Pick for a random ticket.",
    },
    {
      number: "3",
      title: "Checkout",
      description: "Review your cart, pay in Thai baht, and follow the order from your dashboard.",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              LU
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-600">
                US Lottery Service
              </p>
              <p className="text-lg font-semibold tracking-tight text-slate-950">LottoUSA</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm font-medium text-slate-500 md:flex">
            <a href="#buy" className="transition hover:text-slate-950">
              Games
            </a>
            <a href="#steps" className="transition hover:text-slate-950">
              Steps
            </a>
            <a href="/admin" className="text-slate-400 transition hover:text-slate-700">
              Admin
            </a>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  <CircleUserRound className="mr-2 size-4 text-slate-500" />
                  <span className="hidden sm:inline">{session.user.name}</span>
                </div>
              </>
            ) : (
              <>
                <a
                  href="#buy"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  Log In
                </a>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                Choose a game, pick numbers, checkout
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Play US jackpots with a cleaner, easier flow.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                We stripped the page back to the essentials: open draws, clear timing, quick
                number entry, and a simple cart.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#buy"
                  className="inline-flex items-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Choose a Game
                  <ArrowRight className="ml-2 size-4" />
                </a>
                <a
                  href="#steps"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  See the Steps
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Open games
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {openDraws.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Best jackpot
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {strongestJackpot}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Next draw
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    {nextDraw ? nextDraw.drawDateThai : "Waiting for schedule"}
                  </p>
                  {nextDraw && (
                    <p className="mt-1 text-sm text-slate-500">{nextDraw.drawTimeThai} น.</p>
                  )}
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-950">Open now</p>

              <div className="mt-4 space-y-3">
                {openDraws.length > 0 ? (
                  openDraws.map((draw) => (
                    <div key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {draw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {draw.drawDateThai} at {draw.drawTimeThai} น.
                          </p>
                        </div>
                        <p className="text-lg font-semibold tracking-tight text-slate-950">
                          {draw.jackpot ?? "Updating"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No open draws right now.
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">Simple flow</p>
                <div className="mt-4 space-y-3">
                  {steps.map((step) => (
                    <div key={step.number} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                        {step.number}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="buy" className="mx-auto max-w-6xl px-5 pb-12 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Games
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Pick your numbers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Each card below shows the jackpot, the draw time, and one clear button to start
              building a ticket.
            </p>
          </div>
          <LotterySection draws={enriched} isLoggedIn={Boolean(session)} />
        </section>

        <section id="steps" className="mx-auto max-w-6xl px-5 pb-16 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Steps
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              The whole flow in three steps.
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                    {step.number}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
