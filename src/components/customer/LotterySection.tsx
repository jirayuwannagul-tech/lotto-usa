"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

const CART_KEY = "lotto_cart"
const COUNTDOWN_WINDOW_MS = 72 * 60 * 60 * 1000

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
    label: "พาวเวอร์บอล",
    logo: "/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png",
    badgeClass: "border-rose-100 bg-rose-50 text-rose-700",
    accentClass: "bg-rose-500",
    emphasisClass: "text-rose-600",
  },
  MEGA_MILLIONS: {
    label: "เมกา มิลเลียนส์",
    logo: "/273-2730781_mega-millions-logo-png.png",
    badgeClass: "border-sky-100 bg-sky-50 text-sky-700",
    accentClass: "bg-sky-500",
    emphasisClass: "text-sky-600",
  },
} as const

const SPECIAL_LABELS: Record<DrawType, string> = {
  POWERBALL: "พาวเวอร์บอล",
  MEGA_MILLIONS: "เมก้าบอล",
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "กำลังออกรางวัล"

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days} วัน ${hours} ชม.`
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`
  return `${minutes} นาที`
}

function CountdownPanel({ targetAt }: { targetAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remainingMs = new Date(targetAt).getTime() - now
  const progress = clamp((remainingMs / COUNTDOWN_WINDOW_MS) * 100, 0, 100)

  return (
    <div className="min-w-[132px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        เวลาที่เหลือ
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {formatRemaining(remainingMs)}
      </p>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
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
      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
        selected
          ? special
            ? "border-slate-950 bg-slate-950 text-white"
            : "border-emerald-500 bg-emerald-500 text-white"
          : disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
  const specialLabel = SPECIAL_LABELS[draw.type as DrawType]
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
  const pricePerTicket = rule.priceUSD + 1.5

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${theme.badgeClass}`}
          >
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
        <CountdownPanel targetAt={draw.drawDate} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-500">แจ็กพอต</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          {draw.jackpot ?? "กำลังอัปเดต"}
        </p>
        <p className="mt-2 text-sm text-slate-500">ราคาต่อใบประมาณ ${pricePerTicket.toFixed(2)}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            วันออกรางวัล
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{draw.drawDateThai}</p>
          <p className={`mt-1 text-sm font-medium ${theme.emphasisClass}`}>{draw.drawTimeThai} น.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            ปิดรับซื้อ
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{draw.cutoffDateThai}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{draw.cutoffTimeThai} น.</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        เลือกเลขหลัก {rule.mainCount} ตัว และเลขพิเศษ 1 ตัว ({specialLabel})
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onExpand}
          className="inline-flex items-center rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          เลือกเลข
          <ArrowRight className="ml-2 size-4" />
        </button>
        <button
          type="button"
          onClick={quickPick}
          className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          สุ่มเลขอัตโนมัติ
          <Sparkles className="ml-2 size-4 text-emerald-500" />
        </button>
      </div>

      {expanded && (
        <div className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                เลือกเลขสำหรับตั๋วของคุณ
              </p>
              <p className="mt-1 text-sm text-slate-500">
                เลือกเลขให้ครบ แล้วเพิ่มตั๋วใบนี้ลงตะกร้า
              </p>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              ปิด
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">1. เลขหลัก</p>
              <p className="text-sm text-slate-500">
                {main.length}/{rule.mainCount}
              </p>
            </div>
            <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
              {Array.from({ length: rule.mainMax }, (_, index) =>
                String(index + 1).padStart(2, "0")
              ).map((value) => (
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

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-950">2. {specialLabel}</p>
              <p className="text-sm text-slate-500">{special || "เลือก 1 ตัว"}</p>
            </div>
            <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
              {Array.from({ length: rule.specialMax }, (_, index) =>
                String(index + 1).padStart(2, "0")
              ).map((value) => (
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-950">3. ตั๋วที่เลือก</p>
            <p className="mt-1 text-sm text-slate-500">เมื่อตรวจสอบเลขเรียบร้อยแล้ว สามารถเพิ่มลงตะกร้าได้ทันที</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {main.length > 0 ? (
                main.map((value) => (
                  <span
                    key={value}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800"
                  >
                    {value}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400">ยังไม่ได้เลือกเลขหลัก</span>
              )}

              {special && (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {special}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={addTicket}
              disabled={!ready}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              เพิ่มตั๋วลงตะกร้า
              <ShoppingBag className="ml-2 size-4" />
            </button>
          </div>
        </div>
      )}
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
      router.push("/login")
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
        setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
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
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <ShoppingBag className="size-5" />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          ตะกร้า
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">ตะกร้าของคุณ</h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          เลือกเลขให้ครบก่อน แล้วค่อยสร้างรายการเพื่อไปหน้าชำระเงิน
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
            จำนวนตั๋ว
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{items.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
            จำนวนงวด
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{drawCount}</p>
        </div>
      </div>

      <div className="mt-5 flex-1">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-500">ตะกร้ายังว่างอยู่</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              เปิดการ์ดเกม เลือกเลข แล้วเพิ่มตั๋วเข้ามาที่นี่ได้เลย
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{theme.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{draw?.drawDateThai}</p>
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-800"
                      >
                        {value}
                      </span>
                    ))}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
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

      {items.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>ข้อมูลบัญชีรับโอนจะแสดงในหน้าชำระเงินของแต่ละรายการเท่านั้น</p>
          {drawCount > 1 && (
            <p>ตอนนี้คุณเลือกหลายงวด ระบบจะสร้างรายการแยกตามงวดและพาไปดูต่อในแดชบอร์ด</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={checkout}
        disabled={items.length === 0 || loading}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {loading ? "กำลังสร้างรายการ..." : isLoggedIn ? "สร้างรายการและไปหน้าชำระเงิน" : "เข้าสู่ระบบเพื่อสร้างรายการ"}
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
        <article className="flex h-full items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="w-full text-sm text-slate-500">ตอนนี้พาวเวอร์บอลยังไม่เปิดขาย</p>
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
        <article className="flex h-full items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="w-full text-sm text-slate-500">ตอนนี้เมกา มิลเลียนส์ยังไม่เปิดขาย</p>
        </article>
      )}

      <div className="xl:col-span-2">
        <CartCard
          items={cart}
          draws={draws}
          isLoggedIn={isLoggedIn}
          onRemove={removeFromCart}
          onClearCart={clearCart}
        />
      </div>
    </div>
  )
}
