"use client"

import { useState } from "react"

export function TgTestButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/tg-test", { method: "POST" })
      const data = await res.json() as {
        ok: boolean
        error?: string
        envCheck?: { botToken: string; adminChatIds: string }
        results?: { chatId: string; ok: boolean; error: string | null }[]
      }

      if (!data.ok) {
        setResult(`❌ ${data.error ?? "ไม่สามารถส่งได้"}\nBot: ${data.envCheck?.botToken}\nChat: ${data.envCheck?.adminChatIds}`)
      } else {
        const sent = data.results?.filter((r) => r.ok).length ?? 0
        setResult(`✅ ส่งสำเร็จ ${sent} chat(s) — ตรวจสอบ TG ได้เลย`)
      }
    } catch {
      setResult("❌ ไม่สามารถเชื่อมต่อ server ได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleTest}
        disabled={loading}
        className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "🔔 ทดสอบ TG"}
      </button>
      {result && (
        <p className="max-w-xs whitespace-pre-wrap text-right text-xs text-slate-600">{result}</p>
      )}
    </div>
  )
}
