"use client"

import { useState } from "react"

export function ReannounceResultsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSend() {
    const confirmed = window.confirm("ส่งผลหวยย้อนหลังทั้งหมดไป Telegram ใช่ไหม? (สูงสุด 20 งวดล่าสุด)")
    if (!confirmed) return

    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/reannounce-results", { method: "POST" })
      const data = await res.json().catch(() => null) as { announced?: number; error?: string } | null
      if (res.ok) {
        setResult(`✅ ส่งแล้ว ${data?.announced ?? 0} งวด`)
      } else {
        setResult(`❌ ${data?.error ?? "เกิดข้อผิดพลาด"}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "เชื่อมต่อไม่ได้"
      setResult(`❌ ${message}`)
    } finally {
      setLoading(false)
      setTimeout(() => setResult(null), 6000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSend}
        disabled={loading}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "ส่งผลหวยไป TG"}
      </button>
      {result && (
        <div className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
          {result}
        </div>
      )}
    </div>
  )
}
