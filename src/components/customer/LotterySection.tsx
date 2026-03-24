"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { signIn } from "next-auth/react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleUserRound,
  Gauge,
  LogIn,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

const CART_KEY = "lotto_cart"
const RING_RADIUS = 28
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_WINDOW_MS = 72 * 60 * 60 * 1000

interface Draw {
  id: string
  type: string
  drawDate: string
  cutoffAt: string
  jackpot?: string | null
  drawDateThai: string
  drawTimeThai: string
  cutoffDateThai: string
  cutoffTimeThai: string
}

interface CartItem {
  drawId: string
  drawType: string
  mainNumbers: string[]
  specialNumber: string
}

const GAME_THEME = {
  POWERBALL: {
    label: "Powerball",
    logo: "/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png",
    badgeClass: "border-rose-100 bg-rose-50 text-rose-700",
    accentClass: "bg-rose-500",
    secondaryClass: "text-rose-600",
  },
  MEGA_MILLIONS: {
    label: "Mega Millions",
    logo: "/273-2730781_mega-millions-logo-png.png",
    badgeClass: "border-sky-100 bg-sky-50 text-sky-700",
    accentClass: "bg-sky-500",
    secondaryClass: "text-sky-600",
  },
} as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "Live"

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function CountdownRing({ targetAt }: { targetAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remainingMs = new Date(targetAt).getTime() - now
  const progress = clamp((remainingMs / RING_WINDOW_MS) * 100, 0, 100)
  const dashOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg className="-rotate-90" width="80" height="80" viewBox="0 0 80 80" aria-hidden>
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          stroke="#e2e8f0"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={RING_RADIUS}
          stroke="#22c55e"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Draw
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-950">
          {formatRemaining(remainingMs)}
        </span>
      </div>
    </div>
  )
}

function NumberBall({
  n,
  selected,
  disabled,
  special,
  onClick,
}: {
  n: string
  selected: boolean
  disabled: boolean
  special?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
        selected
          ? special
            ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_28px_-20px_rgba(15,23,42,0.75)]"
            : "border-emerald-400 bg-emerald-500 text-white shadow-[0_20px_30px_-18px_rgba(34,197,94,0.8)]"
          : disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
            : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {n}
    </button>
  )
}

function PortalCard({
  draw,
  expanded,
  onExpand,
  onCollapse,
  onAddToCart,
}: {
  draw: Draw
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onAddToCart: (item: CartItem) => void
}) {
  const rule = LOTTERY_RULES[draw.type as DrawType]
  const theme = GAME_THEME[draw.type as DrawType]
  const [main, setMain] = useState<string[]>([])
  const [special, setSpecial] = useState("")

  function toggleMain(value: string) {
    setMain((prev) =>
      prev.includes(value)
        ? prev.filter((entry) => entry !== value)
        : prev.length < rule.mainCount
          ? [...prev, value].sort()
          : prev
    )
  }

  function toggleSpecial(value: string) {
    setSpecial((prev) => (prev === value ? "" : value))
  }

  function quickPick() {
    const pool = (max: number) =>
      Array.from({ length: max }, (_, index) => String(index + 1).padStart(2, "0"))
    const pick = (values: string[], count: number) => {
      const remaining = [...values]
      const selected: string[] = []
      while (selected.length < count) {
        const index = Math.floor(Math.random() * remaining.length)
        selected.push(remaining.splice(index, 1)[0])
      }
      return selected.sort()
    }

    setMain(pick(pool(rule.mainMax), rule.mainCount))
    setSpecial(pick(pool(rule.specialMax), 1)[0])
    onExpand()
  }

  function addTicket() {
    if (main.length !== rule.mainCount || !special) return
    onAddToCart({
      drawId: draw.id,
      drawType: draw.type,
      mainNumbers: main,
      specialNumber: special,
    })
    setMain([])
    setSpecial("")
    onCollapse()
  }

  const ready = main.length === rule.mainCount && special !== ""

  return (
    <article className="group flex h-full flex-col rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_32px_85px_-44px_rgba(15,23,42,0.5)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${theme.badgeClass}`}>
            <span className={`mr-2 h-2 w-2 rounded-full ${theme.accentClass}`} />
            {theme.label}
          </span>
          <Image
            src={theme.logo}
            alt={theme.label}
            width={138}
            height={52}
            className="h-10 w-auto object-contain"
          />
        </div>
        <CountdownRing targetAt={draw.drawDate} />
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live jackpot</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
          {draw.jackpot ?? "Updating"}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <CalendarClock className="size-3.5" />
            Draw time
          </div>
          <p className="text-sm font-semibold text-slate-900">{draw.drawDateThai}</p>
          <p className={`mt-1 text-sm font-medium ${theme.secondaryClass}`}>{draw.drawTimeThai} น.</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Gauge className="size-3.5" />
            Cutoff
          </div>
          <p className="text-sm font-semibold text-slate-900">{draw.cutoffDateThai}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{draw.cutoffTimeThai} น.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex items-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_22px_42px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
        >
          Play Now
          <ArrowRight className="ml-2 size-4" />
        </button>
        <button
          type="button"
          onClick={quickPick}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
        >
          Quick Pick
          <Sparkles className="ml-2 size-4 text-emerald-500" />
        </button>
      </div>

      {expanded && (
        <div className="mt-6 space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Build your ticket</p>
              <p className="text-sm text-slate-500">
                {rule.mainCount} main numbers + {rule.specialLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Main Numbers
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {main.length}/{rule.mainCount}
              </p>
            </div>
            <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
              {Array.from({ length: rule.mainMax }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => (
                <NumberBall
                  key={value}
                  n={value}
                  selected={main.includes(value)}
                  disabled={main.length >= rule.mainCount && !main.includes(value)}
                  onClick={() => toggleMain(value)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {rule.specialLabel}
              </p>
              <p className="text-sm font-semibold text-slate-700">{special || "Select one"}</p>
            </div>
            <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
              {Array.from({ length: rule.specialMax }, (_, index) => String(index + 1).padStart(2, "0")).map((value) => (
                <NumberBall
                  key={value}
                  n={value}
                  selected={special === value}
                  disabled={false}
                  special
                  onClick={() => toggleSpecial(value)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected ticket</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {main.length > 0 ? (
                main.map((value) => (
                  <span
                    key={value}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-800"
                  >
                    {value}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">No main numbers yet</span>
              )}
              {special && (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                  {special}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={addTicket}
              disabled={!ready}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_42px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              Add Ticket to Cart
              <ShoppingBag className="ml-2 size-4" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function AccessCard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError("Email or password is incorrect")
      return
    }
    router.refresh()
  }

  if (isLoggedIn) {
    return (
      <article className="flex h-full flex-col rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5" />
          </div>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Connected
          </span>
        </div>
        <div className="mt-5">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Account is ready.</h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Continue to your dashboard for receipts, order history, and matched tickets after checkout.
          </p>
        </div>
        <div className="mt-6 space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          {[
            "Checkout creates one order per draw automatically.",
            "Receipt review stays in the same clean workflow.",
            "Your cart remains available in this browser session.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
              <p className="text-sm leading-6 text-slate-600">{item}</p>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="mt-auto inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Open Dashboard
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </article>
    )
  }

  return (
    <article className="flex h-full flex-col rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <CircleUserRound className="size-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Access
        </span>
      </div>
      <div className="mt-5">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Log in to continue.</h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Connect your account to move straight from portal selection into checkout and order tracking.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-11 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
          required
        />
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_42px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {loading ? "Signing in..." : "Log In"}
          <LogIn className="ml-2 size-4" />
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="font-semibold text-emerald-600 transition hover:text-emerald-500">
          Create an account
        </Link>
      </p>
    </article>
  )
}

function CartCard({
  items,
  draws,
  isLoggedIn,
  onRemove,
  onClearCart,
}: {
  items: CartItem[]
  draws: Draw[]
  isLoggedIn: boolean
  onRemove: (index: number) => void
  onClearCart?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function checkout() {
    if (!isLoggedIn) {
      document.getElementById("account-portal")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (items.length === 0) return

    setLoading(true)
    setError("")

    const grouped: Record<string, CartItem[]> = {}
    for (const item of items) {
      if (!grouped[item.drawId]) grouped[item.drawId] = []
      grouped[item.drawId].push(item)
    }

    const createdOrderIds: string[] = []
    for (const [drawId, drawItems] of Object.entries(grouped)) {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawId,
          items: drawItems.map((item) => ({
            mainNumbers: item.mainNumbers,
            specialNumber: item.specialNumber,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setLoading(false)
        setError(data.error ?? "Something went wrong")
        return
      }
      createdOrderIds.push(data.id)
    }

    setLoading(false)
    onClearCart?.()
    if (createdOrderIds.length === 1) {
      router.push(`/orders/${createdOrderIds[0]}/pay`)
      return
    }
    router.push("/dashboard")
  }

  const drawCount = new Set(items.map((item) => item.drawId)).size

  return (
    <article className="flex h-full flex-col rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ShoppingBag className="size-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Queue
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Checkout lane.</h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Review tickets from all active portals before sending them to checkout.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tickets</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{items.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draws</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{drawCount}</p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-500">No tickets in the queue yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open a portal card, pick numbers, and send a ticket into this lane.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const draw = draws.find((entry) => entry.id === item.drawId)
              const theme = GAME_THEME[item.drawType as DrawType]
              return (
                <div
                  key={`${item.drawId}-${index}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {theme.label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{draw?.drawDateThai}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="text-lg leading-none text-slate-300 transition hover:text-rose-500"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.mainNumbers.map((value) => (
                      <span
                        key={value}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-800"
                      >
                        {value}
                      </span>
                    ))}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {item.specialNumber}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

      <button
        type="button"
        onClick={checkout}
        disabled={items.length === 0 || loading}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_42px_-20px_rgba(34,197,94,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        {loading ? "Creating orders..." : isLoggedIn ? "Proceed to Checkout" : "Log in to Checkout"}
        <ArrowRight className="ml-2 size-4" />
      </button>
    </article>
  )
}

export function LotterySection({ draws, isLoggedIn }: { draws: Draw[]; isLoggedIn: boolean }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem(CART_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [activePortal, setActivePortal] = useState<DrawType | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      // Ignore storage write issues in private browsing or restricted environments.
    }
  }, [cart])

  function addToCart(item: CartItem) {
    setCart((prev) => [...prev, item])
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  function clearCart() {
    setCart([])
    try {
      localStorage.removeItem(CART_KEY)
    } catch {
      // Ignore storage removal issues in restricted environments.
    }
  }

  const powerball = draws.find((draw) => draw.type === "POWERBALL")
  const megaMillions = draws.find((draw) => draw.type === "MEGA_MILLIONS")

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {powerball ? (
        <PortalCard
          draw={powerball}
          expanded={activePortal === "POWERBALL"}
          onExpand={() => setActivePortal("POWERBALL")}
          onCollapse={() => setActivePortal(null)}
          onAddToCart={addToCart}
        />
      ) : (
        <article className="flex h-full items-center rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
          <p className="w-full text-sm text-slate-500">Powerball portal is currently offline.</p>
        </article>
      )}

      {megaMillions ? (
        <PortalCard
          draw={megaMillions}
          expanded={activePortal === "MEGA_MILLIONS"}
          onExpand={() => setActivePortal("MEGA_MILLIONS")}
          onCollapse={() => setActivePortal(null)}
          onAddToCart={addToCart}
        />
      ) : (
        <article className="flex h-full items-center rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)]">
          <p className="w-full text-sm text-slate-500">Mega Millions portal is currently offline.</p>
        </article>
      )}

      <div id="account-portal">
        <AccessCard isLoggedIn={isLoggedIn} />
      </div>

      <CartCard
        items={cart}
        draws={draws}
        isLoggedIn={isLoggedIn}
        onRemove={removeFromCart}
        onClearCart={clearCart}
      />
    </div>
  )
}
