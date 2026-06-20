"use client"

import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = await res.json().catch(() => null)
    setLoading(false)

    if (!res.ok) {
      setError(data?.error ?? "เกิดข้อผิดพลาด")
      return
    }

    if (data?.resetUrl) setResetUrl(data.resetUrl)
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">ลืมรหัสผ่าน</h1>

        {sent ? (
          <div className="mt-6">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <p className="text-4xl">🔑</p>
              <p className="mt-3 font-semibold text-emerald-800">สร้างลิงก์แล้ว!</p>
              {resetUrl ? (
                <a
                  href={resetUrl}
                  className="mt-3 block break-all text-sm font-semibold text-emerald-700 underline"
                >
                  กดที่นี่เพื่อตั้งรหัสผ่านใหม่ →
                </a>
              ) : (
                <p className="mt-2 text-sm text-emerald-700">ลิงก์ถูกส่งไปที่อีเมลของคุณแล้ว (หมดอายุใน 1 ชั่วโมง)</p>
              )}
            </div>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-semibold text-slate-500 hover:text-slate-950"
            >
              กลับไปล็อกอิน
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              {loading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-slate-500 hover:text-slate-950"
            >
              กลับไปล็อกอิน
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
