"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  userId: string
  userLabel: string
}

export function DeleteMemberButton({ userId, userLabel }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    const confirmed = window.confirm(`ลบสมาชิก ${userLabel} และออเดอร์ที่ผูกอยู่ทั้งหมดใช่หรือไม่?`)
    if (!confirmed) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/admin/members/${userId}`, {
        method: "DELETE",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "ลบสมาชิกไม่สำเร็จ")
        return
      }

      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      >
        {loading ? "กำลังลบ..." : "ลบสมาชิก"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
