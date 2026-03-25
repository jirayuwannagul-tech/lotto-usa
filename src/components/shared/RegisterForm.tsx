"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [lineId, setLineId] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          lineId,
          referralCode,
          password,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(data?.error ?? "สมัครสมาชิกไม่สำเร็จ")
        return
      }

      setMessage("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ")
      router.push("/login")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 grid gap-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">ชื่อ</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="ชื่อผู้ใช้งาน"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">เบอร์โทร</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="08x-xxx-xxxx"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Line ID</label>
        <input
          type="text"
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="line id"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">รหัสผู้แนะนำ</label>
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="ใส่ได้ครั้งเดียวตอนสมัคร"
        />
        <p className="mt-2 text-xs text-slate-500">ถ้าใส่รหัสนี้ ระบบจะผูกผู้แนะนำให้ถาวรกับบัญชีนี้</p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400"
          placeholder="••••••••"
          required
        />
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "กำลังสมัครสมาชิก..." : "Register"}
      </button>
      <p className="text-center text-sm text-slate-500">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-medium text-emerald-600 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  )
}
