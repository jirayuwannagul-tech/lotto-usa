import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authOptions } from "@/lib/auth"
import LoginForm from "@/components/shared/LoginForm"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🎱</div>
          <h1 className="text-3xl font-bold text-white">LottoUSA</h1>
          <p className="mt-1 text-blue-300">เข้าสู่ระบบ</p>
        </div>

        <Card className="border-white/20 bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-white">เข้าสู่ระบบบัญชี</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
            <p className="text-center text-sm text-white/50">
              <Link href="/" className="text-blue-300 hover:underline">
                กลับไปหน้าแรก
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
