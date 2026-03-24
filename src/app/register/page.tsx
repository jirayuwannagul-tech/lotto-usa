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
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    lineId: "",
    password: "",
    confirm: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [field]: e.target.value }))
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
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg items-center">
        <Card className="w-full rounded-3xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4 border-b border-slate-100 pb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold tracking-[0.28em] text-white">
              LU
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">CUSTOMER REGISTER</p>
              <CardTitle className="mt-3 text-3xl tracking-tight text-slate-950">
                สมัครสมาชิก
              </CardTitle>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                สร้างบัญชีไว้เพื่อดูรายการเดิม ส่งสลิป และติดตามสถานะการซื้อได้จากบัญชีเดียว
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">ชื่อ - นามสกุล *</Label>
                <Input
                  value={form.name}
                  onChange={update("name")}
                  placeholder="สมชาย ใจดี"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">อีเมล *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="example@email.com"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-700">เบอร์โทรศัพท์</Label>
                  <Input
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="089-xxx-xxxx"
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">ไลน์ไอดี</Label>
                  <Input
                    value={form.lineId}
                    onChange={update("lineId")}
                    placeholder="@lineid"
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">รหัสผ่าน *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">ยืนยันรหัสผ่าน *</Label>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={update("confirm")}
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  required
                />
              </div>

              {error && <p className="text-center text-sm text-rose-600">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
              >
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>
            </form>

            <div className="mt-5 space-y-2 text-center text-sm text-slate-500">
              <p>
                มีบัญชีแล้ว?{" "}
                <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
              <p>
                <Link href="/" className="text-slate-500 hover:text-slate-700">
                  กลับไปหน้าแรก
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
