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
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">เข้าสู่ระบบลูกค้า</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            กลับมาดูรายการและชำระเงินต่อได้จากหน้าเดียว
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            หลังเข้าสู่ระบบแล้ว คุณจะเห็นรายการที่ซื้อไป รายการที่รอชำระเงิน และปุ่มซื้อเพิ่มในแดชบอร์ดเดียวกัน
          </p>

          <div className="mt-6 space-y-3">
            {[
              "ดูเลขที่ซื้อทั้งหมดจากแดชบอร์ด",
              "กดเข้าหน้าชำระเงินเมื่อพร้อมโอน",
              "ติดตามสถานะหลังส่งสลิปได้จากบัญชีเดิม",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-slate-950">เข้าสู่ระบบบัญชี</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm redirectTo="/dashboard" portal="customer" theme="light" />
            <p className="text-center text-sm text-slate-500">
              <Link href="/" className="font-medium text-emerald-600 hover:underline">
                กลับไปหน้าแรก
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
