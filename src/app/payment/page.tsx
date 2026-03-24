"use client"

import Link from "next/link"
import { useState } from "react"

interface CheckoutSet {
  mainNumbers: string[]
  specialNumber: string
}

interface CheckoutState {
  title: string
  drawType: string
  sets: CheckoutSet[]
}

export default function PaymentPage() {
  const [checkout] = useState<CheckoutState | null>(() => {
    if (typeof window === "undefined") return null
    const raw = window.sessionStorage.getItem("lottery_checkout")
    if (!raw) return null
    try {
      return JSON.parse(raw) as CheckoutState
    } catch {
      return null
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">ชำระเงิน</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-semibold text-slate-500">รายการที่เลือก</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {checkout?.title ?? "ยังไม่มีรายการ"}
          </h1>

          {checkout?.sets?.length ? (
            <div className="mt-6 space-y-3">
              {checkout.sets.map((set, index) => (
                <div
                  key={`${set.mainNumbers.join("-")}-${set.specialNumber}-${index}`}
                  className="rounded-2xl bg-white p-4"
                >
                  <p className="text-sm font-semibold text-slate-700">ชุดที่ {index + 1}</p>
                  <p className="mt-2 font-mono text-base text-slate-950">
                    {set.mainNumbers.join(" - ")} ● {set.specialNumber}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-base leading-8 text-slate-600">
              ยังไม่มีรายการจากหน้าซื้อหวย ให้กลับไปเลือกตัวเลขก่อน
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
