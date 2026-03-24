import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  BadgeDollarSign,
  CircleUserRound,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
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

  const powerball = enriched.find((draw) => draw.type === "POWERBALL")
  const megaMillions = enriched.find((draw) => draw.type === "MEGA_MILLIONS")
  const strongestJackpot = [powerball?.jackpot, megaMillions?.jackpot].find(Boolean) ?? "Live update"

  const now = new Date()
  const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
  const cutoff1430 = new Date(thaiNow)
  cutoff1430.setHours(14, 30, 0, 0)
  const todayDraw = draws.find((draw) => {
    const localized = new Date(draw.drawDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    return (
      localized.getFullYear() === thaiNow.getFullYear() &&
      localized.getMonth() === thaiNow.getMonth() &&
      localized.getDate() === thaiNow.getDate()
    )
  })

  const liveStats = [
    {
      label: "Open Portals",
      value: String(enriched.length).padStart(2, "0"),
      detail: "Powerball and Mega Millions live",
      icon: Sparkles,
    },
    {
      label: "Best Jackpot",
      value: strongestJackpot,
      detail: "Updated from the latest open draw",
      icon: BadgeDollarSign,
    },
    {
      label: "Settlement",
      value: "THB",
      detail: "Checkout in Thai baht with real tickets",
      icon: ShieldCheck,
    },
    {
      label: "Next Result",
      value: todayDraw ? "Today" : "Queue",
      detail: todayDraw ? "A live draw is on today's board" : "Waiting for the next draw day",
      icon: Clock3,
    },
  ]

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(255,255,255,0))]" />
        <div className="absolute right-[-140px] top-16 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.18),rgba(34,197,94,0))]" />
        <div className="absolute left-[-160px] top-48 h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12),rgba(59,130,246,0))]" />
      </div>

      <nav className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_35px_-18px_rgba(15,23,42,0.8)]">
              <Image
                src="/next.svg"
                alt="LottoUSA"
                width={22}
                height={22}
                className="h-5 w-auto brightness-0 invert"
              />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-emerald-600">
                Global Lottery Hub
              </p>
              <p className="text-lg font-semibold tracking-tight text-slate-950">LottoUSA</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
            <a href="#hub" className="transition hover:text-slate-950">Main Hub</a>
            <a href="#buy" className="transition hover:text-slate-950">Games</a>
            <a href="#how" className="transition hover:text-slate-950">How It Works</a>
            <a href="/admin" className="text-slate-400 transition hover:text-slate-700">Admin</a>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.6)]">
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
                  Log in
                </a>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative">
        {todayDraw && (
          <section className="mx-auto max-w-7xl px-5 pt-6 sm:px-6">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.4)]">
              <p className="text-sm font-medium text-slate-600">
                {thaiNow >= cutoff1430 ? (
                  <>
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Today&apos;s {todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"} draw is already live on the board.
                  </>
                ) : (
                  <>
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Today includes a live {todayDraw.type === "POWERBALL" ? "Powerball" : "Mega Millions"} draw. Results follow after 14:30 Bangkok time.
                  </>
                )}
              </p>
            </div>
          </section>
        )}

        <section
          id="hub"
          className="mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
        >
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <Sparkles className="size-3.5" />
              Modern Lottery Console
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                A faster, cleaner way to play US jackpots from Thailand.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Browse open games, see live jackpot sizes, and move from pick to checkout in a frictionless dashboard built for speed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#buy"
                className="inline-flex items-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_50px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Explore Games
                <ArrowRight className="ml-2 size-4" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
              >
                View Flow
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {liveStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] backdrop-blur"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {stat.label}
                      </span>
                      <div className="flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{stat.detail}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Powerball Portal",
                value: powerball?.jackpot ?? "Pending",
                detail: powerball ? `${powerball.drawDateThai} • ${powerball.drawTimeThai} น.` : "No open draw right now",
                surface: "from-rose-50 via-white to-white",
                border: "border-rose-100",
                label: "Red Channel",
              },
              {
                title: "Mega Millions Portal",
                value: megaMillions?.jackpot ?? "Pending",
                detail: megaMillions ? `${megaMillions.drawDateThai} • ${megaMillions.drawTimeThai} น.` : "No open draw right now",
                surface: "from-sky-50 via-white to-white",
                border: "border-sky-100",
                label: "Blue Channel",
              },
              {
                title: "Thai Checkout",
                value: "Smooth",
                detail: "A local-banking style checkout flow with upload and approval tracking.",
                surface: "from-emerald-50 via-white to-white",
                border: "border-emerald-100",
                label: "Success Green",
              },
              {
                title: "Trust Layer",
                value: "Verified",
                detail: "Receipt uploads, admin review, ticket matching, and result updates from one clean board.",
                surface: "from-slate-100 via-white to-white",
                border: "border-slate-200",
                label: "Operational Control",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-[30px] border bg-gradient-to-br p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)] ${card.surface} ${card.border}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{card.label}</p>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{card.title}</h2>
                <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">{card.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="buy" className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Main Hub
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Four cards. Two live games. One smooth checkout lane.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              Each card acts like a portal: live jackpot on top, draw timing on the side, fast actions in the center, and a clean path into cart and account access.
            </p>
          </div>
          <LotterySection draws={enriched} isLoggedIn={Boolean(session)} />
        </section>

        <section id="how" className="mx-auto max-w-7xl px-5 pb-16 sm:px-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                How It Works
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Built for speed, clarity, and trust.
              </h3>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Pick Faster",
                desc: "Open a game portal, use quick pick if you want, and add tickets in a few taps.",
                icon: Sparkles,
              },
              {
                title: "Pay Confidently",
                desc: "Checkout in Thai baht, upload a receipt, and track approval without leaving the dashboard flow.",
                icon: ShieldCheck,
              },
              {
                title: "Stay Updated",
                desc: "See ticket matching, pending items, and draw updates in one clean interface with high contrast and low friction.",
                icon: Clock3,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-[30px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.34)]"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="size-5" />
                  </div>
                  <h4 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">{item.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
