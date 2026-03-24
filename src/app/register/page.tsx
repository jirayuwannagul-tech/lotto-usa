"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", phone: "", lineId: "", password: "", confirm: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }
    setLoading(true)
    setError("")

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด")
    } else {
      router.push("/?registered=1")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎱</div>
          <h1 className="text-3xl font-bold text-white">LottoUSA</h1>
          <p className="text-blue-300 mt-1">สมัครสมาชิกใหม่</p>
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-center">สมัครสมาชิก</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">ชื่อ - นามสกุล *</Label>
                <Input value={form.name} onChange={update("name")} placeholder="สมชาย ใจดี" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" required />
              </div>
              <div className="space-y-2">
                <Label className="text-white">อีเมล *</Label>
                <Input type="email" value={form.email} onChange={update("email")} placeholder="example@email.com" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white">เบอร์โทรศัพท์</Label>
                  <Input value={form.phone} onChange={update("phone")} placeholder="089-xxx-xxxx" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Line ID</Label>
                  <Input value={form.lineId} onChange={update("lineId")} placeholder="line_id" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">รหัสผ่าน *</Label>
                <Input type="password" value={form.password} onChange={update("password")} placeholder="••••••••" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" required />
              </div>
              <div className="space-y-2">
                <Label className="text-white">ยืนยันรหัสผ่าน *</Label>
                <Input type="password" value={form.confirm} onChange={update("confirm")} placeholder="••••••••" className="bg-white/20 border-white/30 text-white placeholder:text-white/50" required />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold">
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>

              <p className="text-center text-white/70 text-sm">
                มีบัญชีแล้ว?{" "}
                <Link href="/login" className="text-blue-300 hover:underline">เข้าสู่ระบบ</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
