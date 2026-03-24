"use client"

import { useRouter } from "next/navigation"
import { NumberPicker } from "@/components/customer/NumberPicker"
import { DrawType } from "@/lib/lottery-rules"

interface NumberSet {
  mainNumbers: string[]
  specialNumber: string
}

interface LotteryPurchasePanelProps {
  title: string
  drawType: DrawType
  accentClass: string
}

export function LotteryPurchasePanel({
  title,
  drawType,
  accentClass,
}: LotteryPurchasePanelProps) {
  const router = useRouter()

  function handleOrder(sets: NumberSet[]) {
    sessionStorage.setItem(
      "lottery_checkout",
      JSON.stringify({
        title,
        drawType,
        sets,
      })
    )
    router.push("/payment")
  }

  return (
    <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8">
      <p className={`text-sm font-semibold ${accentClass}`}>หน้าซื้อหวย</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-4 text-base leading-8 text-slate-600">
        เลือกตัวเลขเองได้ หรือกดสุ่มเลขอัตโนมัติ แล้วกดปุ่มคำสั่งซื้อที่บรรทัดล่างสุด
      </p>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <NumberPicker
          drawType={drawType}
          onConfirm={handleOrder}
          confirmLabel="สั่งซื้อหวย"
        />
      </div>
    </div>
  )
}
