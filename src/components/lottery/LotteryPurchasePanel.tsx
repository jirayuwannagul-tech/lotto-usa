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
  drawId: string
  accentClass: string
}

export function LotteryPurchasePanel({
  title,
  drawType,
  drawId,
  accentClass,
}: LotteryPurchasePanelProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleOrder(sets: NumberSet[]) {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawId,
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
    <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8">
      <p className={`text-sm font-semibold ${accentClass}`}>หน้าซื้อหวย</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-4 text-base leading-8 text-slate-600">
        เลือกตัวเลขเองได้ หรือกดสุ่มเลขอัตโนมัติ แล้วกดปุ่มคำสั่งซื้อที่บรรทัดล่างสุด
      </p>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <NumberPicker drawType={drawType} onConfirm={handleOrder} confirmLabel="สั่งซื้อหวย" />
        {loading && <p className="mt-4 text-sm text-slate-500">กำลังสร้างออเดอร์...</p>}
        {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </div>
  )
}
