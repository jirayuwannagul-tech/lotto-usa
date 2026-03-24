import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { AdminSummaryButton } from "@/components/admin/AdminSummaryButton"
import LogoutButton from "@/components/shared/LogoutButton"
import { authOptions } from "@/lib/auth"

const adminLinks = [
  { href: "/admin", label: "ภาพรวมระบบ" },
  { href: "/admin/draws", label: "จัดการงวด" },
  { href: "/admin/tickets", label: "อัปโหลดตั๋ว" },
  { href: "/admin/results", label: "ประกาศผล" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/admin-login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_32%),linear-gradient(180deg,#020617_0%,#08111f_48%,#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-cyan-950/60 bg-slate-950/75 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="px-6 py-6">
            <Link href="/admin" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold tracking-[0.3em] text-cyan-200">
                OPS
              </div>
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300/80">ADMIN PORTAL</p>
                <p className="text-lg font-semibold tracking-tight text-white">LottoUSA Back Office</p>
              </div>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              พื้นที่สำหรับตรวจสลิป สรุปยอด อัปโหลดตั๋ว และประกาศผล แยกออกจากหน้าซื้อของลูกค้าโดยตรง
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 px-6 pb-6 lg:flex-col">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden px-6 pb-6 lg:block">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-500">ACTIVE ACCOUNT</p>
              <p className="mt-3 text-sm font-semibold text-white">{session.user.name}</p>
              <p className="mt-1 text-sm text-slate-400">{session.user.email}</p>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/70 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300/70">SEPARATE ADMIN WORKSPACE</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">ศูนย์ปฏิบัติการผู้ดูแลระบบ</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AdminSummaryButton />
                <LogoutButton
                  redirectTo="/admin-login"
                  className="border border-slate-800 bg-slate-900/80 px-4 text-slate-300 hover:bg-slate-900 hover:text-white"
                />
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
