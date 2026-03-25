"use client"

import { useState } from "react"
import { getSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoginFormProps {
  redirectTo?: string
  portal?: "customer" | "admin"
  showRegisterLink?: boolean
  theme?: "light" | "dark"
}

export default function LoginForm({
  redirectTo = "/dashboard",
  portal = "customer",
  showRegisterLink = true,
  theme = "light",
}: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem("lotto_last_login_email") ?? ""
  })
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const isDark = theme === "dark"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    } else {
      const session = await getSession()
      const role = session?.user?.role

      if (portal === "admin" && role !== "ADMIN") {
        await signOut({ redirect: false })
        setError("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแล")
        return
      }

      if (portal === "customer" && role === "ADMIN") {
        await signOut({ redirect: false })
        setError("บัญชีแอดมินต้องเข้าใช้งานผ่านหน้า /admin-login เท่านั้น")
        return
      }

      const nextPath = role === "ADMIN" ? "/admin" : redirectTo
      window.localStorage.setItem("lotto_last_login_email", email)
      router.push(nextPath)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={cn("mb-1 block text-sm", isDark ? "text-white/70" : "text-slate-700")}>
          อีเมล
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
          className={cn(
            isDark
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
              : "h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
          )}
          required
        />
      </div>
      <div>
        <label className={cn("mb-1 block text-sm", isDark ? "text-white/70" : "text-slate-700")}>
          รหัสผ่าน
        </label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className={cn(
            isDark
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/40"
              : "h-11 rounded-xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
          )}
          required
        />
      </div>
      {error && (
        <p className={cn("text-center text-sm", isDark ? "text-red-400" : "text-rose-600")}>{error}</p>
      )}
      <Button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full font-semibold",
          isDark
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
        )}
      >
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
      {showRegisterLink && (
        <p className={cn("text-center text-sm", isDark ? "text-white/50" : "text-slate-500")}>
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/register"
            className={cn(isDark ? "text-blue-400 hover:underline" : "font-medium text-emerald-600 hover:underline")}
          >
            สมัครสมาชิก
          </Link>
        </p>
      )}
    </form>
  )
}
