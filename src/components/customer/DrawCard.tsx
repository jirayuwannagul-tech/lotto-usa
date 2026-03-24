"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { NumberPicker } from "@/components/customer/NumberPicker"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

interface Draw {
  id: string
  type: string
  drawDate: string
  cutoffAt: string
  jackpot?: string | null
}

interface Props {
  draw: Draw
  isLoggedIn: boolean
  drawDateThai: string
  drawTimeThai: string
  cutoffDateThai: string
  cutoffTimeThai: string
}

export function DrawCard({ draw, isLoggedIn, drawDateThai, drawTimeThai, cutoffDateThai, cutoffTimeThai }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const rule = LOTTERY_RULES[draw.type as DrawType]
  const isPowerball = draw.type === "POWERBALL"

  const accentColor = isPowerball ? "#ef4444" : "#3b82f6"
  const glowColor = isPowerball ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"

  function handleConfirm(sets: { mainNumbers: string[]; specialNumber: string }[]) {
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/orders/new?drawId=${draw.id}`)
      return
    }
    // Store selections in sessionStorage, redirect to order page
    sessionStorage.setItem("pendingOrder", JSON.stringify({ drawId: draw.id, sets }))
    router.push(`/orders/new?drawId=${draw.id}`)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isPowerball
          ? "linear-gradient(135deg, rgba(12,5,20,0.95), rgba(30,10,10,0.9))"
          : "linear-gradient(135deg, rgba(5,10,25,0.95), rgba(5,15,35,0.9))",
        border: `1px solid ${isPowerball ? "rgba(220,38,38,0.4)" : "rgba(37,99,235,0.4)"}`,
        boxShadow: `0 0 40px ${glowColor}20`,
      }}
    >
      {/* Card header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Image
            src={isPowerball
              ? "/png-clipart-powerball-progressive-jackpot-minnesota-state-lottery-mega-millions-lottery-miscellaneous-game.png"
              : "/273-2730781_mega-millions-logo-png.png"
            }
            alt={rule.name}
            width={130}
            height={50}
            className="object-contain"
          />
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}60`, color: accentColor }}
          >
            เปิดรับ
          </span>
        </div>

        {draw.jackpot && (
          <div className="mb-4 text-center py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Jackpot สะสม</p>
            <p
              className="font-black text-4xl sm:text-5xl"
              style={{ background: "linear-gradient(90deg, #fde68a, #f59e0b, #fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              {draw.jackpot}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">ออกรางวัล</p>
            <p className="text-white font-semibold text-sm">{drawDateThai}</p>
            <p className="font-bold mt-0.5" style={{ color: accentColor }}>{drawTimeThai} น.</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">ปิดรับออเดอร์</p>
            <p className="text-white font-semibold text-sm">{cutoffDateThai}</p>
            <p className="text-orange-400 font-bold mt-0.5">{cutoffTimeThai} น.</p>
          </div>
        </div>

        {!showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-3 rounded-xl font-bold text-white transition hover:opacity-90"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, ${isPowerball ? "#991b1b" : "#1d4ed8"})`,
              boxShadow: `0 4px 20px ${glowColor}`,
            }}
          >
            🎟 เลือกเลข & ซื้อเลย
          </button>
        )}
      </div>

      {/* Number picker */}
      {showPicker && (
        <div className="px-6 pb-6 pt-0 border-t border-white/5">
          <div className="flex justify-between items-center py-3 mb-2">
            <p className="text-white/60 text-sm">เลือกตัวเลขของคุณ</p>
            <button onClick={() => setShowPicker(false)} className="text-white/30 hover:text-white/60 text-xs">✕ ปิด</button>
          </div>
          <NumberPicker
            drawType={draw.type as DrawType}
            onConfirm={handleConfirm}
          />
          {!isLoggedIn && (
            <p className="text-center text-white/30 text-xs mt-3">* ต้องเข้าสู่ระบบก่อนชำระเงิน</p>
          )}
        </div>
      )}
    </div>
  )
}
