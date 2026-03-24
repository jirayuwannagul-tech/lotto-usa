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
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: e.target.value }))
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
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_460px] lg:items-center">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">สมัครสมาชิก</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            สร้างบัญชีไว้เพื่อดูรายการเดิมและส่งสลิปได้ง่ายขึ้น
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            ใช้บัญชีเดียวในการติดตามเลขที่ซื้อ รายการรอชำระเงิน และผลหลังผู้ดูแลอัปเดตสถานะให้เรียบร้อยแล้ว
          </p>
        </section>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-slate-950">สมัครสมาชิกใหม่</CardTitle>
          </CardHeader>
          <CardContent>
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

              <p className="text-center text-sm text-slate-500">
                มีบัญชีแล้ว?{" "}
                <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
