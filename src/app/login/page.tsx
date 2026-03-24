"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (res?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎱</div>
          <h1 className="text-3xl font-bold text-white">LottoUSA</h1>
          <p className="text-blue-300 mt-1">ซื้อ Powerball & Mega Millions จากไทย</p>
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-center">เข้าสู่ระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">อีเมล</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">รหัสผ่าน</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2"
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>

              <p className="text-center text-white/70 text-sm">
                ยังไม่มีบัญชี?{" "}
                <Link href="/register" className="text-blue-300 hover:underline">
                  สมัครสมาชิก
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
