import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import LoginForm from "@/components/shared/LoginForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LogoutButton from "@/components/shared/LogoutButton"
import { authOptions } from "@/lib/auth"

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user.role === "ADMIN") redirect("/admin")
  const hasCustomerSession = !!session

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_28%),linear-gradient(180deg,#020617_0%,#08111f_48%,#0f172a_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-cyan-200">
            ADMIN ACCESS ONLY
          </div>
          <div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              ทางเข้าแอดมินแยกจากหน้าลูกค้าอย่างชัดเจน
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              ใช้หน้านี้สำหรับตรวจสลิป สรุปยอด ส่งรายการให้ทีมซื้อ และอัปโหลดตั๋วกลับเข้าระบบโดยเฉพาะ
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">ไม่ปนกับลูกค้า</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                แอดมินจะเข้าผ่าน portal ของตัวเอง และหลังล็อกอินจะถูกพาไปที่หน้าจัดการทันที
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold text-white">พร้อมใช้งานหลังบ้าน</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                ตรวจสลิป อัปโหลดตั๋ว ประกาศผล และดูยอดรวมได้จากชุดเมนูเดียวกัน
              </p>
            </div>
          </div>
        </section>

        <Card className="border-slate-800 bg-slate-950/85 shadow-2xl shadow-cyan-950/30">
          <CardHeader>
            <CardTitle className="text-center text-white">เข้าสู่ระบบผู้ดูแล</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCustomerSession && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">ตอนนี้คุณกำลังใช้บัญชีลูกค้าอยู่</p>
                <p className="mt-1 leading-6 text-amber-100/80">
                  หน้านี้มีไว้สำหรับผู้ดูแลระบบเท่านั้น คุณสามารถออกจากบัญชีเดิมก่อน
                  หรือเข้าสู่ระบบใหม่ด้วยบัญชีแอดมินได้จากฟอร์มด้านล่าง
                </p>
                <div className="mt-3">
                  <LogoutButton
                    redirectTo="/admin-login"
                    className="border border-amber-400/30 bg-amber-500/10 px-4 text-amber-100 hover:bg-amber-500/20"
                  />
                </div>
              </div>
            )}
            <LoginForm portal="admin" redirectTo="/admin" showRegisterLink={false} />
            <div className="space-y-2 text-center text-sm text-slate-400">
              <p>
                ถ้าเป็นลูกค้าให้ไปที่{" "}
                <Link href="/login" className="text-cyan-300 hover:underline">
                  หน้าเข้าสู่ระบบลูกค้า
                </Link>
              </p>
              <p>
                <Link href="/" className="text-slate-500 hover:text-slate-300">
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
