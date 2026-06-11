"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { NumberPicker } from "@/components/customer/NumberPicker"
import { DrawType } from "@/lib/lottery-rules"

interface NumberSet {
  mainNumbers: string[]
  specialNumber: string
}

interface LotteryPurchasePanelProps {
  title: string
  drawType: DrawType
  drawDateLabel: string
  accentClass: string
  existingReferralCode?: string | null
}

export function LotteryPurchasePanel({
  title,
  drawType,
  drawDateLabel,
  accentClass,
  existingReferralCode,
}: LotteryPurchasePanelProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [referralCode, setReferralCode] = useState("")

  async function handleOrder(sets: NumberSet[]) {
    setLoading(true)
    setError("")

    try {
      // Save referral code first if entered and user doesn't have one yet
      if (!existingReferralCode && referralCode.trim()) {
        const refRes = await fetch("/api/user/referral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode: referralCode.trim() }),
        })
        if (!refRes.ok) {
          const refData = await refRes.json().catch(() => null)
          setError(refData?.error ?? "รหัสผู้แนะนำไม่ถูกต้อง")
          return
        }
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawType,
          items: sets.map((set) => ({
            mainNumbers: set.mainNumbers,
            specialNumber: set.specialNumber,
          })),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? "สร้างออเดอร์ไม่สำเร็จ")
        return
      }

      sessionStorage.setItem(
        "lottery_checkout",
        JSON.stringify({
          orderId: data.id,
          title,
          drawType,
          sets,
          totalTHB: data.totalTHB,
          totalUSD: data.totalUSD,
        })
      )
      router.push("/payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className={`text-sm font-semibold ${accentClass}`}>หน้าซื้อหวย</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-4 text-base leading-8 text-white/60">
        เลือกตัวเลขเองได้ หรือกดสุ่มเลขอัตโนมัติ แล้วกดปุ่มคำสั่งซื้อที่บรรทัดล่างสุด
      </p>
      <p className="mt-3 text-sm font-medium text-white/40">
        ถ้าสั่งซื้อตอนนี้ ออเดอร์จะเข้ารอบงวด {drawDateLabel}
      </p>

      {existingReferralCode ? (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-white/50">รหัสผู้แนะนำ:</span>
          <span className="font-mono text-sm font-semibold text-emerald-400">{existingReferralCode}</span>
        </div>
      ) : (
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            รหัสผู้แนะนำ <span className="text-white/30">(ไม่บังคับ — ใส่ได้ครั้งเดียว)</span>
          </label>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="เช่น ABC1234"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 font-mono text-sm uppercase text-white placeholder:text-white/20 outline-none focus:border-white/30"
          />
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6">
        <NumberPicker drawType={drawType} onConfirm={handleOrder} confirmLabel="สั่งซื้อหวย" />
        {loading && <p className="mt-4 text-sm text-white/50">กำลังสร้างออเดอร์...</p>}
        {error && <p className="mt-4 text-sm font-medium text-rose-400">{error}</p>}
      </div>
    </div>
  )
}
