import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { AdminAccountForm } from "@/components/admin/AdminAccountForm"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/admin-login")

  const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!admin) redirect("/admin-login")

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / SETTINGS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">ตั้งค่าบัญชี Admin</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          เปลี่ยนชื่อ, เบอร์โทร (ใช้เป็น username สำหรับ login), และรหัสผ่านของบัญชี admin
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <AdminAccountForm name={admin.name} phone={admin.phone} />
      </div>
    </section>
  )
}
