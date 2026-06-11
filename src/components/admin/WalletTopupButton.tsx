"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  userId: string
  userName: string
  currentBalance: number
}

export function WalletTopupButton({ userId, userName, currentBalance }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError("กรุณาใส่จำนวนเงินที่ถูกต้อง")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/wallet/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, note }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "เกิดข้อผิดพลาด")
        return
      }

      setOpen(false)
      setAmount("")
      setNote("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        เติมเงิน Wallet
      </button>
    )
  }

  return (
    <form onSubmit={handleTopup} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-[220px]">
      <p className="text-xs font-semibold text-slate-700">{userName}</p>
      <p className="text-xs text-slate-500">ยอดปัจจุบัน: {currentBalance.toLocaleString("th-TH")} ฿</p>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="จำนวนเงิน (บาท)"
        min="1"
        step="1"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        autoFocus
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="หมายเหตุ (ไม่บังคับ)"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "กำลังเติม..." : "ยืนยัน"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError("") }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
