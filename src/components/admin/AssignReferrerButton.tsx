"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  userId: string
  userName: string
  existingReferrerName?: string | null
}

export function AssignReferrerButton({ userId, userName, existingReferrerName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (existingReferrerName) {
    return <span className="text-xs text-slate-400">มีผู้แนะนำแล้ว</span>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "เกิดข้อผิดพลาด")
        return
      }
      setOpen(false)
      setCode("")
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
        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
      >
        ใส่รหัสผู้แนะนำ
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-slate-700">{userName}</p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="รหัสผู้แนะนำ"
        autoFocus
        className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "ยืนยัน"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); setCode("") }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
