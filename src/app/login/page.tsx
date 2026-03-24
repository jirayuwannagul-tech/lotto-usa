import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authOptions } from "@/lib/auth"
import LoginForm from "@/components/shared/LoginForm"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <Card className="w-full rounded-3xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4 border-b border-slate-100 pb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold tracking-[0.28em] text-white">
              LU
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">CUSTOMER LOGIN</p>
              <CardTitle className="mt-3 text-3xl tracking-tight text-slate-950">
                เข้าสู่ระบบลูกค้า
              </CardTitle>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                ใช้หน้านี้เพื่อดูรายการที่ซื้อไว้ ไปหน้าชำระเงิน และติดตามสถานะหลังส่งสลิป
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            <LoginForm redirectTo="/dashboard" portal="customer" theme="light" />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-sm font-semibold text-slate-950">หลังเข้าสู่ระบบแล้วจะทำอะไรได้บ้าง</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>ดูเลขที่ซื้อไว้ทั้งหมดในแดชบอร์ด</p>
                <p>กดเข้าหน้าชำระเงินของแต่ละรายการได้ทันที</p>
                <p>เช็กสถานะหลังผู้ดูแลตรวจสลิปและอัปเดตตั๋ว</p>
              </div>
            </div>

            <div className="space-y-2 text-center text-sm text-slate-500">
              <p>
                ยังไม่มีบัญชี?{" "}
                <Link href="/register" className="font-medium text-emerald-600 hover:underline">
                  สมัครสมาชิก
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
