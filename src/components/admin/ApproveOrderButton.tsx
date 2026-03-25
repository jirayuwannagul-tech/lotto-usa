"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function ApproveOrderButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/${paymentId}/approve`, { method: "PATCH" })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error ?? "ยืนยันออเดอร์ไม่สำเร็จ")
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={loading}
      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
    >
      {loading ? "กำลังยืนยัน..." : "ยืนยันรับออเดอร์"}
    </button>
  )
}
