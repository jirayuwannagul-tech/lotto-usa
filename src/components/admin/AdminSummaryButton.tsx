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
        className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "📊 สรุปวันนี้"}
      </button>
      {result && (
        <div className="absolute top-full right-0 mt-2 whitespace-nowrap text-xs bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white/80 z-20">
          {result}
        </div>
      )}
    </div>
  )
}
