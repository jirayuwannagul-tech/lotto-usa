"use client"

import { useState } from "react"

export function AdminSummaryButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/daily-summary", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setResult("✅ ส่งสรุปทาง LINE แล้ว")
      } else {
        setResult(`❌ ${data.error ?? "เกิดข้อผิดพลาด"}`)
      }
    } catch {
      setResult("❌ เชื่อมต่อไม่ได้")
    } finally {
      setLoading(false)
      setTimeout(() => setResult(null), 5000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "ส่งสรุปวันนี้"}
      </button>
      {result && (
        <div className="absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
          {result}
        </div>
      )}
    </div>
  )
}
