"use client"

import { useState } from "react"

type Props = {
  name: string
  phone: string | null
}

export function AdminAccountForm({ name, phone }: Props) {
  const [form, setForm] = useState({
    name,
    phone: phone ?? "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่ไม่ตรงกัน" })
      return
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setMessage({ type: "error", text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" })
      return
    }

    setLoading(true)
    try {
      const body: Record<string, string> = {}
      if (form.name.trim() !== name) body.name = form.name.trim()
      if (form.phone.trim() !== (phone ?? "")) body.phone = form.phone.trim()
      if (form.newPassword) {
        body.currentPassword = form.currentPassword
        body.newPassword = form.newPassword
      }

      if (Object.keys(body).length === 0) {
        setMessage({ type: "error", text: "ไม่มีข้อมูลที่เปลี่ยนแปลง" })
        return
      }

      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "เกิดข้อผิดพลาด" })
      } else {
        setMessage({ type: "success", text: "บันทึกสำเร็จ กรุณา login ใหม่หากเปลี่ยน username/password" })
        setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`rounded-2xl px-5 py-4 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-950">ข้อมูลบัญชี</h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">ชื่อ</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            เบอร์โทร (ใช้ login)
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-950">เปลี่ยนรหัสผ่าน</h3>
        <p className="text-sm text-slate-500">กรอกเฉพาะเมื่อต้องการเปลี่ยน ถ้าไม่กรอกจะไม่เปลี่ยน</p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">รหัสผ่านปัจจุบัน</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">รหัสผ่านใหม่</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            autoComplete="new-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </form>
  )
}
