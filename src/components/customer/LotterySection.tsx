"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

// ─── Types ───────────────────────────────────────────────
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

// ─── Number Grid ─────────────────────────────────────────
function NumberBall({ n, selected, disabled, special, onClick }: {
  n: string; selected: boolean; disabled: boolean; special?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full text-sm font-bold transition-all select-none"
      style={{
        background: selected
          ? special ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)"
          : disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
        color: selected ? "#fff" : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)",
        transform: selected ? "scale(1.12)" : "scale(1)",
        boxShadow: selected ? (special ? "0 0 12px rgba(245,158,11,0.6)" : "0 0 12px rgba(59,130,246,0.6)") : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {n}
    </button>
  )
}

// ─── Single Draw Picker ───────────────────────────────────
function DrawPicker({ draw, onAddToCart }: { draw: Draw; onAddToCart: (item: CartItem) => void }) {
  const rule = LOTTERY_RULES[draw.type as DrawType]
  const isPB = draw.type === "POWERBALL"
  const accentColor = isPB ? "#ef4444" : "#3b82f6"

  const [main, setMain] = useState<string[]>([])
  const [special, setSpecial] = useState("")

  function toggleMain(n: string) {
    setMain((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < rule.mainCount ? [...prev, n].sort() : prev
    )
  }
  function toggleSpecial(n: string) { setSpecial((p) => (p === n ? "" : n)) }

  function quickPick() {
    const pool = (max: number) => Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, "0"))
    const pick = (arr: string[], n: number) => {
      const a = [...arr]; const out: string[] = []
      while (out.length < n) { const i = Math.floor(Math.random() * a.length); out.push(a.splice(i, 1)[0]) }
      return out.sort()
    }
    setMain(pick(pool(rule.mainMax), rule.mainCount))
    setSpecial(pick(pool(rule.specialMax), 1)[0])
  }

  const ready = main.length === rule.mainCount && special !== ""

  function addToCart() {
    if (!ready) return
    onAddToCart({ drawId: draw.id, drawType: draw.type, mainNumbers: main, specialNumber: special })
    setMain([]); setSpecial("")
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isPB ? "linear-gradient(135deg,rgba(20,5,5,.97),rgba(30,10,10,.9))" : "linear-gradient(135deg,rgba(5,10,25,.97),rgba(5,15,35,.9))",
        border: `1px solid ${isPB ? "rgba(220,38,38,.35)" : "rgba(37,99,235,.35)"}`,
      }}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Image
            src={isPB
              ? "/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png"
              : "/273-2730781_mega-millions-logo-png.png"}
            alt={rule.name} width={120} height={46} className="object-contain"
          />
          <div className="text-right">
            <p className="text-white/40 text-xs">ออกรางวัล</p>
            <p className="text-white text-sm font-semibold">{draw.drawDateThai}</p>
            <p className="font-bold text-sm" style={{ color: accentColor }}>{draw.drawTimeThai} น.</p>
          </div>
        </div>
        {draw.jackpot && (
          <div className="text-center py-2 mb-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Jackpot</p>
            <p className="font-black text-3xl" style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b,#fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {draw.jackpot}
            </p>
          </div>
        )}
      </div>

      {/* Picker */}
      <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
        {/* Main numbers */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-xs">เลือก {rule.mainCount} เลข (1–{rule.mainMax}) <span className="text-blue-400 font-mono ml-1">{main.length}/{rule.mainCount}</span></span>
            <button onClick={quickPick} className="text-xs px-2 py-1 rounded-md transition" style={{ background: "rgba(255,255,255,0.06)", color: "#a78bfa" }}>🎲 สุ่ม</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: rule.mainMax }, (_, i) => String(i + 1).padStart(2, "0")).map((n) => (
              <NumberBall key={n} n={n} selected={main.includes(n)} disabled={main.length >= rule.mainCount && !main.includes(n)} onClick={() => toggleMain(n)} />
            ))}
          </div>
        </div>

        {/* Special number */}
        <div>
          <div className="text-white/60 text-xs mb-2">
            {rule.specialLabel} (1–{rule.specialMax})
            {special && <span className="ml-2 font-bold" style={{ color: accentColor }}>{special}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: rule.specialMax }, (_, i) => String(i + 1).padStart(2, "0")).map((n) => (
              <NumberBall key={n} n={n} selected={special === n} disabled={false} special onClick={() => toggleSpecial(n)} />
            ))}
          </div>
        </div>

        {/* Selected preview */}
        {main.length > 0 && (
          <div className="rounded-xl px-4 py-3 font-mono text-center text-white" style={{ background: "rgba(255,255,255,0.05)" }}>
            <span>{main.join(" · ")}</span>
            {special && <span className="ml-3 font-bold" style={{ color: accentColor }}>● {special}</span>}
          </div>
        )}

        {/* Add to cart */}
        <button
          onClick={addToCart}
          disabled={!ready}
          className="w-full py-3 rounded-xl font-bold text-white transition"
          style={{
            background: ready ? `linear-gradient(90deg,${accentColor},${isPB ? "#991b1b" : "#1d4ed8"})` : "rgba(255,255,255,0.06)",
            color: ready ? "#fff" : "rgba(255,255,255,0.25)",
            cursor: ready ? "pointer" : "not-allowed",
            boxShadow: ready ? `0 4px 20px ${accentColor}40` : "none",
          }}
        >
          {ready ? "🛒 เพิ่มลงตะกร้า" : `เลือกให้ครบก่อน (${main.length}/${rule.mainCount} ${special ? "✓" : "· " + rule.specialLabel})`}
        </button>
      </div>
    </div>
  )
}

// ─── Cart Panel ───────────────────────────────────────────
function CartPanel({ items, draws, isLoggedIn, onRemove }: {
  items: CartItem[]
  draws: Draw[]
  isLoggedIn: boolean
  onRemove: (idx: number) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function checkout() {
    if (!isLoggedIn) { router.push("/login"); return }
    if (items.length === 0) return
    setLoading(true); setError("")

    // Group by drawId and submit orders
    const grouped: Record<string, CartItem[]> = {}
    for (const item of items) {
      if (!grouped[item.drawId]) grouped[item.drawId] = []
      grouped[item.drawId].push(item)
    }

    const firstDrawId = Object.keys(grouped)[0]
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drawId: firstDrawId,
        items: grouped[firstDrawId].map((i) => ({ mainNumbers: i.mainNumbers, specialNumber: i.specialNumber })),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return }
    router.push(`/orders/${data.id}/pay`)
  }

  return (
    <div className="rounded-2xl p-[1px]" style={{ background: "linear-gradient(135deg,rgba(201,168,76,.5),rgba(255,255,255,.05),rgba(201,168,76,.2))" }}>
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(160deg,rgba(15,12,30,.97),rgba(10,8,20,.95))" }}>
        <h3 className="font-black text-base mb-3" style={{ background: "linear-gradient(90deg,#f5d485,#c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🛒 ตะกร้า {items.length > 0 && `(${items.length} ใบ)`}
        </h3>

        {items.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-4">ยังไม่มีเลขในตะกร้า</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {items.map((item, i) => {
              const draw = draws.find((d) => d.id === item.drawId)
              const isPB = item.drawType === "POWERBALL"
              return (
                <div key={i} className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div>
                    <p className="text-white/50 text-[10px] mb-1">{isPB ? "🔴 Powerball" : "🔵 Mega Millions"} · {draw?.drawDateThai}</p>
                    <p className="font-mono text-white text-sm">
                      {item.mainNumbers.join(" · ")}
                      <span className="ml-2 font-bold" style={{ color: isPB ? "#ef4444" : "#3b82f6" }}>● {item.specialNumber}</span>
                    </p>
                  </div>
                  <button onClick={() => onRemove(i)} className="text-white/20 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <button
          onClick={checkout}
          disabled={items.length === 0 || loading}
          className="w-full py-3 rounded-xl font-bold transition"
          style={{
            background: items.length > 0 ? "linear-gradient(90deg,#f5d485,#c9a84c)" : "rgba(255,255,255,0.05)",
            color: items.length > 0 ? "#1a1000" : "rgba(255,255,255,0.2)",
            cursor: items.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "กำลังดำเนินการ..." : isLoggedIn ? "ชำระเงิน →" : "เข้าสู่ระบบเพื่อชำระ"}
        </button>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────
export function LotterySection({ draws, isLoggedIn }: { draws: Draw[]; isLoggedIn: boolean }) {
  const [cart, setCart] = useState<CartItem[]>([])

  function addToCart(item: CartItem) {
    setCart((prev) => [...prev, item])
  }
  function removeFromCart(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const powerball = draws.find((d) => d.type === "POWERBALL")
  const mega = draws.find((d) => d.type === "MEGA_MILLIONS")

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — pickers */}
      <div className="lg:col-span-3 space-y-5">
        {powerball ? (
          <DrawPicker draw={powerball} onAddToCart={addToCart} />
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/25 text-sm">Powerball — ยังไม่มีงวดที่เปิดรับ</p>
          </div>
        )}
        {mega ? (
          <DrawPicker draw={mega} onAddToCart={addToCart} />
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/25 text-sm">Mega Millions — ยังไม่มีงวดที่เปิดรับ</p>
          </div>
        )}
      </div>

      {/* Right — cart */}
      <div className="lg:col-span-2 space-y-4">
        <CartPanel items={cart} draws={draws} isLoggedIn={isLoggedIn} onRemove={removeFromCart} />
      </div>
    </div>
  )
}
