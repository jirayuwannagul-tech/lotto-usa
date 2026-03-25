"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { LOTTERY_RULES, MARGIN_USD } from "@/lib/lottery-rules"

interface CheckoutSet {
  mainNumbers: string[]
  specialNumber: string
}

interface CheckoutState {
  orderId?: string
  title: string
  drawType: string
  sets: CheckoutSet[]
  totalTHB?: string | number
  totalUSD?: string | number
}

function formatBaht(amount: number) {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
  const [slip, setSlip] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const ticketCount = checkout?.sets?.length ?? 0
  const rule = checkout ? LOTTERY_RULES[checkout.drawType as keyof typeof LOTTERY_RULES] : null
  const estimatedTotalThb =
    typeof checkout?.totalTHB === "number"
      ? checkout.totalTHB
      : typeof checkout?.totalTHB === "string"
        ? Number(checkout.totalTHB)
        : rule
          ? Math.round((rule.priceUSD + MARGIN_USD) * ticketCount * 35)
          : 0
  const referenceId =
    checkout && ticketCount > 0
      ? `${checkout.drawType.slice(0, 3)}-${String(ticketCount).padStart(2, "0")}-${checkout.sets[0]?.specialNumber ?? "00"}`
      : "-"

  async function handleUploadSlip(e: React.FormEvent) {
    e.preventDefault()
    if (!checkout?.orderId || !slip) {
      setUploadMessage("กรุณาเลือกสลิปก่อนส่ง")
      return
    }

    setSubmitting(true)
    setUploadMessage(null)

    try {
      const formData = new FormData()
      formData.append("orderId", checkout.orderId)
      formData.append("slip", slip)

      const response = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setUploadMessage(data?.error ?? "อัปโหลดสลิปไม่สำเร็จ")
        return
      }

      setUploadMessage("อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบออเดอร์")
      setSlip(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">ชำระเงิน</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
            <p className="text-sm font-semibold text-slate-500">สรุปออเดอร์</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {checkout?.title ?? "ยังไม่มีรายการ"}
            </h1>

            {checkout?.sets?.length ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">จำนวนชุด</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{ticketCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">ยอดชำระโดยประมาณ</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatBaht(estimatedTotalThb)} บาท
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-slate-500">เลขอ้างอิง</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{referenceId}</p>
                  </div>
                </div>

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
              </>
            ) : (
              <p className="mt-4 text-base leading-8 text-slate-600">
                ยังไม่มีรายการจากหน้าซื้อหวย ให้กลับไปเลือกตัวเลขก่อน
              </p>
            )}
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">ชำระเงินด้วย QR Code</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src="/payment-qr.jpg"
                alt="QR Payment"
                width={885}
                height={1200}
                className="h-auto w-full"
                unoptimized
              />
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-950">ชื่อบัญชี:</span> นาย จิรายุ วรรณกุล
              </p>
              <p>
                <span className="font-semibold text-slate-950">บัญชี:</span> xxx-x-x4305-x
              </p>
              <p>
                <span className="font-semibold text-slate-950">เลขอ้างอิง:</span> {referenceId}
              </p>
              <p className="pt-2 text-xs leading-6 text-slate-500">
                หลังจากโอนเงินแล้ว ให้เก็บสลิปไว้สำหรับแนบในขั้นตอนถัดไป
              </p>
            </div>

            <form onSubmit={handleUploadSlip} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">อัปโหลดสลิป</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              <button
                type="submit"
                disabled={submitting || !checkout?.orderId}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                {submitting ? "กำลังส่งสลิป..." : "ส่งสลิปให้แอดมินตรวจสอบ"}
              </button>
              {!checkout?.orderId && (
                <p className="mt-3 text-xs text-rose-600">ยังไม่พบออเดอร์ที่ผูกกับรายการนี้ กรุณากลับไปสั่งซื้อใหม่</p>
              )}
              {uploadMessage && <p className="mt-3 text-sm text-slate-600">{uploadMessage}</p>}
            </form>
          </aside>
        </div>
      </div>
    </div>
  )
}
