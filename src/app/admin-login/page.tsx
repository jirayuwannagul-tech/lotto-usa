import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoginForm from "@/components/shared/LoginForm"
import LogoutButton from "@/components/shared/LogoutButton"
import { authOptions } from "@/lib/auth"

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user.role === "ADMIN") redirect("/admin")
  const hasCustomerSession = !!session

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="rounded-3xl bg-slate-900 p-8 text-slate-100 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN ACCESS ONLY</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            ทางเข้าแอดมินถูกแยกออกจากหน้าลูกค้าแล้ว
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            ใช้หน้านี้สำหรับผู้ดูแลเท่านั้น เมื่อเข้าสู่ระบบแล้วจะถูกพาไปยังหน้าหลังบ้านเพื่อจัดการสลิป
            อัปโหลดตั๋ว และประกาศผล
          </p>

          <div className="mt-6 space-y-3">
            {[
              "ตรวจสลิปและอนุมัติรายการ",
              "อัปโหลดตั๋วที่ซื้อจริงกลับเข้าระบบ",
              "ประกาศผลและตรวจสถานะรายการย้อนหลัง",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-slate-800 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-slate-950">เข้าสู่ระบบผู้ดูแล</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCustomerSession && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">ตอนนี้คุณกำลังใช้บัญชีลูกค้าอยู่</p>
                <p className="mt-1 leading-6">
                  หากต้องการเข้าแอดมิน ให้กดออกจากระบบเดิมก่อน หรือเข้าสู่ระบบใหม่ด้วยบัญชีแอดมิน
                </p>
                <div className="mt-3">
                  <LogoutButton
                    redirectTo="/admin-login"
                    className="border border-amber-300 bg-white px-4 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                  />
                </div>
              </div>
            )}

            <LoginForm portal="admin" redirectTo="/admin" showRegisterLink={false} theme="light" />

            <div className="space-y-2 text-center text-sm text-slate-500">
              <p>
                ถ้าเป็นลูกค้าให้ไปที่{" "}
                <Link href="/login" className="font-medium text-emerald-600 hover:underline">
                  หน้าเข้าสู่ระบบลูกค้า
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
