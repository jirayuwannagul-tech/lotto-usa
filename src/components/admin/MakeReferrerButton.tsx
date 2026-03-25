"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  userId: string
  userName: string
  existingCode?: string | null
}

export function MakeReferrerButton({ userId, userName, existingCode }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleAppoint() {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(`/api/admin/referrers/${userId}`, {
        method: "POST",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(data?.error ?? "แต่งตั้งผู้แนะนำไม่สำเร็จ")
        return
      }

      setMessage(`รหัสผู้แนะนำ: ${data.referralCode}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (existingCode) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-emerald-700">ผู้แนะนำแล้ว</p>
        <p className="rounded-lg bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-700">{existingCode}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleAppoint}
        disabled={loading}
        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
      >
        {loading ? "กำลังแต่งตั้ง..." : `แต่งตั้ง ${userName}`}
      </button>
      {message && <p className="text-xs text-sky-700">{message}</p>}
    </div>
  )
}
