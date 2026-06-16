"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
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

interface OrderResponse {
  id: string
  draw: { type: string }
  items: { mainNumbers: string; specialNumber: string }[]
  totalTHB: string | number
  user?: { walletBalance?: string | number }
}

function formatBaht(amount: number) {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function PaymentPage() {
  const [orderIdFromQuery, setOrderIdFromQuery] = useState<string | null>(null)
  const [existingReferralCode, setExistingReferralCode] = useState<string | null>(null)
  const [referralCode, setReferralCode] = useState("")
  const [checkout, setCheckout] = useState<CheckoutState | null>(() => {
    if (typeof window === "undefined") return null
    const raw = window.sessionStorage.getItem("lottery_checkout")
    if (!raw) return null
    try {
      return JSON.parse(raw) as CheckoutState
    } catch {
      return null
    }
  })
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [slip, setSlip] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const query = new URLSearchParams(window.location.search)
    setOrderIdFromQuery(query.get("orderId"))
  }, [])

  useEffect(() => {
    fetch("/api/user/referral")
      .then((r) => r.json())
      .then((d) => { if (d?.referralCode) setExistingReferralCode(d.referralCode) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!orderIdFromQuery) return
    if (checkout?.orderId === orderIdFromQuery) return

    let active = true

    async function loadOrder() {
      const response = await fetch(`/api/orders/${orderIdFromQuery}`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data || !active) return

      const order = data as OrderResponse
      setCheckout({
        orderId: order.id,
        title: order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball",
        drawType: order.draw.type,
        sets: order.items.map((item) => ({
          mainNumbers: item.mainNumbers.split(","),
          specialNumber: item.specialNumber,
        })),
        totalTHB: order.totalTHB,
      })
      if (order.user?.walletBalance !== undefined) {
        setWalletBalance(Number(order.user.walletBalance))
      }
    }

    void loadOrder()

    return () => {
      active = false
    }
  }, [checkout?.orderId, orderIdFromQuery])

  const ticketCount = checkout?.sets?.length ?? 0
  const rule = checkout ? LOTTERY_RULES[checkout.drawType as keyof typeof LOTTERY_RULES] : null
  const estimatedTotalThb =
    typeof checkout?.totalTHB === "number"
      ? checkout.totalTHB
      : typeof checkout?.totalTHB === "string"
        ? Number(checkout.totalTHB)
        : rule
          ? Math.round(rule.sellPriceUSD * ticketCount * 35)
          : 0
  const referenceId =
    checkout && ticketCount > 0
      ? `${checkout.drawType.slice(0, 3)}-${String(ticketCount).padStart(2, "0")}-${checkout.sets[0]?.specialNumber ?? "00"}`
      : "-"

  async function handleWalletPay() {
    if (!checkout?.orderId) return
    setSubmitting(true)
    setUploadMessage(null)
    setUploadSuccess(false)
    try {
      const response = await fetch("/api/payments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: checkout.orderId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setUploadMessage(data?.error ?? "ชำระเงินไม่สำเร็จ")
        return
      }
      setUploadSuccess(true)
      setUploadMessage("ชำระเงินด้วย Wallet สำเร็จ! แอดมินได้รับออเดอร์แล้ว")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUploadSlip(e: React.FormEvent) {
    e.preventDefault()
    if (!checkout?.orderId || !slip) {
      setUploadMessage("กรุณาเลือกสลิปก่อนส่ง")
      return
    }

    setSubmitting(true)
    setUploadMessage(null)
    setUploadSuccess(false)

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
          setUploadMessage(refData?.error ?? "รหัสผู้แนะนำไม่ถูกต้อง")
          return
        }
        const refData = await refRes.json().catch(() => null)
        setExistingReferralCode(refData?.referralCode ?? referralCode.trim())
      }

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

      setUploadSuccess(true)
      setUploadMessage("อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบออเดอร์")
      setSlip(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-white">ชำระเงิน</p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-white/40 transition hover:text-white">
              แดชบอร์ด
            </Link>
            <Link href="/" className="text-sm font-semibold text-white/40 transition hover:text-white">
              ← หน้าแรก
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-semibold text-[#c9a84c]">สรุปออเดอร์</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {checkout?.title ?? "ยังไม่มีรายการ"}
            </h1>

            {checkout?.sets?.length ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/50">จำนวนชุด</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{ticketCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/50">ยอดชำระ</p>
                    <p className="mt-2 text-2xl font-semibold text-[#c9a84c]">
                      {formatBaht(estimatedTotalThb)} บาท
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/50">เลขอ้างอิง</p>
                    <p className="mt-2 text-xl font-semibold text-white">{referenceId}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {checkout.sets.map((set, index) => (
                    <div
                      key={`${set.mainNumbers.join("-")}-${set.specialNumber}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <p className="text-sm font-semibold text-white/50">ชุดที่ {index + 1}</p>
                      <p className="mt-2 font-mono text-base text-white">
                        {set.mainNumbers.join(" - ")} ● {set.specialNumber}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-base leading-8 text-white/50">
                ยังไม่มีรายการจากหน้าซื้อหวย ให้กลับไปเลือกตัวเลขก่อน
              </p>
            )}
          </section>

          <aside className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-6">
            <p className="text-sm font-semibold text-[#c9a84c]">ชำระเงินด้วย QR Code</p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/payment-qr.jpg"
                alt="QR Payment"
                width={885}
                height={1200}
                className="h-auto w-full"
                unoptimized
              />
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              <p>
                <span className="font-semibold text-white">ชื่อบัญชี:</span> นาย จิรายุ วรรณกุล
              </p>
              <p>
                <span className="font-semibold text-white">บัญชี:</span> xxx-x-x4305-x
              </p>
              <p>
                <span className="font-semibold text-white">เลขอ้างอิง:</span> {referenceId}
              </p>
              <p className="pt-2 text-xs leading-6 text-white/40">
                หลังจากโอนเงินแล้ว ให้เก็บสลิปไว้สำหรับแนบในขั้นตอนถัดไป
              </p>
            </div>

            {walletBalance >= estimatedTotalThb && estimatedTotalThb > 0 && !uploadSuccess && (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-400">ชำระด้วย Wallet</p>
                <p className="mt-2 text-sm text-white/60">
                  ยอดใน Wallet: <span className="font-semibold text-emerald-400">{walletBalance.toLocaleString("th-TH")} ฿</span>
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleWalletPay}
                  className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  {submitting ? "กำลังชำระ..." : `ชำระ ${formatBaht(estimatedTotalThb)} ฿ ด้วย Wallet`}
                </button>
                {uploadMessage && (
                  <p className={`mt-3 text-sm ${uploadSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                    {uploadMessage}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleUploadSlip} className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              {existingReferralCode ? (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-white/50">รหัสผู้แนะนำ:</span>
                  <span className="font-mono text-sm font-semibold text-emerald-400">{existingReferralCode}</span>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    รหัสผู้แนะนำ <span className="text-white/30">(ไม่บังคับ — ใส่ได้ครั้งเดียว)</span>
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="เช่น ABC1234"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 font-mono text-sm uppercase text-white placeholder:text-white/20 outline-none focus:border-white/30"
                  />
                </div>
              )}

              <label className="mb-2 block text-sm font-semibold text-white/70">อัปโหลดสลิป</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <button
                type="submit"
                disabled={submitting || !checkout?.orderId}
                className="mt-4 w-full rounded-xl bg-[#c9a84c] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#d4b860] disabled:opacity-40"
              >
                {submitting ? "กำลังส่งสลิป..." : "ส่งสลิปให้แอดมินตรวจสอบ"}
              </button>
              {!checkout?.orderId && (
                <p className="mt-3 text-xs text-rose-400">ยังไม่พบออเดอร์ที่ผูกกับรายการนี้ กรุณากลับไปสั่งซื้อใหม่</p>
              )}
              {uploadMessage && (
                <p className={`mt-3 text-sm ${uploadSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                  {uploadMessage}
                </p>
              )}
            </form>
          </aside>
        </div>
      </div>
    </div>
  )
}
