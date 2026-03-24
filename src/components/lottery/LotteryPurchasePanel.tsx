"use client"

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
  accentClass: string
}

export function LotteryPurchasePanel({
  title,
  drawType,
  accentClass,
}: LotteryPurchasePanelProps) {
  const [submittedSets, setSubmittedSets] = useState<NumberSet[]>([])

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
          onConfirm={setSubmittedSets}
          confirmLabel="สั่งซื้อหวย"
        />
      </div>

      {submittedSets.length > 0 && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-500">รายการที่กดสั่งซื้อแล้ว</p>
          <div className="mt-4 space-y-3">
            {submittedSets.map((set, index) => (
              <div key={`${set.mainNumbers.join("-")}-${set.specialNumber}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">ชุดที่ {index + 1}</p>
                <p className="mt-2 font-mono text-base text-slate-950">
                  {set.mainNumbers.join(" - ")} ● {set.specialNumber}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
