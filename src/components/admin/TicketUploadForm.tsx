"use client"

import { useState } from "react"

interface DrawOption {
  id: string
  label: string
}

export function TicketUploadForm({ draws }: { draws: DrawOption[] }) {
  const [drawId, setDrawId] = useState(draws[0]?.id ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!drawId || !file) {
      setMessage("กรุณาเลือกงวดและไฟล์รูป")
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("drawId", drawId)
      formData.append("ticket", file)

      const res = await fetch("/api/tickets/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage(data?.error ?? "อัปโหลดรูปหวยไม่สำเร็จ")
        return
      }

      if (data?.matched) {
        setMessage(`จับคู่สำเร็จ: ${data.customerName} - ${data.numbers}`)
      } else {
        setMessage(data?.message ?? "อัปโหลดสำเร็จ")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">เลือกงวด</label>
          <select
            value={drawId}
            onChange={(e) => setDrawId(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950"
          >
            {draws.map((draw) => (
              <option key={draw.id} value={draw.id}>
                {draw.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">ไฟล์รูปหวย</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "กำลังอัปโหลด..." : "อัปโหลดรูปหวย"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </form>
  )
}
