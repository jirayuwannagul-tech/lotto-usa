import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { AdminSummaryButton } from "@/components/admin/AdminSummaryButton"
import { AdminNavLink } from "@/components/admin/AdminNavLink"
import LogoutButton from "@/components/shared/LogoutButton"
import { authOptions } from "@/lib/auth"

const adminLinks = [
  { href: "/admin/orders", label: "ยืนยันออเดอร์" },
  { href: "/admin/tickets", label: "อัปโหลดรูปหวย" },
  { href: "/admin/summary", label: "สรุปออเดอร์" },
  { href: "/admin/members", label: "รายชื่อสมาชิก" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/admin-login")
  if (session.user.role !== "ADMIN") redirect("/admin-login")

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800 bg-slate-900 text-slate-100 lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="px-6 py-6">
            <Link href="/admin/summary" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold tracking-[0.3em] text-white">
                OPS
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN PORTAL</p>
                <p className="text-lg font-semibold tracking-tight text-white">LottoUSA Back Office</p>
              </div>
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              หลังบ้านสำหรับตรวจสลิป จัดการงวด อัปโหลดตั๋ว และประกาศผล แยกจากหน้าลูกค้าอย่างชัดเจน
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 px-6 pb-6 lg:flex-col">
            {adminLinks.map((link) => (
              <AdminNavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>

          <div className="hidden px-6 pb-6 lg:block">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-500">ACTIVE ACCOUNT</p>
              <p className="mt-3 text-sm font-semibold text-white">{session.user.name}</p>
              <p className="mt-1 text-sm text-slate-400">{session.user.email}</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">SEPARATE ADMIN WORKSPACE</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  ศูนย์ปฏิบัติการผู้ดูแลระบบ
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminSummaryButton />
                <LogoutButton
                  redirectTo="/admin-login"
                  className="border border-slate-300 bg-white px-4 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                />
              </div>
            </div>
          </header>

          <main className="px-5 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
