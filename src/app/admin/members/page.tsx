import { prisma } from "@/lib/prisma"
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton"

export default async function AdminMembersPage() {
  const members = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / MEMBERS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">รายชื่อสมาชิก</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          ดูรายชื่อสมาชิก ข้อมูลติดต่อ และจำนวนออเดอร์ที่แต่ละคนเคยสร้างไว้
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">ชื่อ</th>
                <th className="pb-3 pr-4 font-medium">อีเมล</th>
                <th className="pb-3 pr-4 font-medium">เบอร์โทร</th>
                <th className="pb-3 pr-4 font-medium">Line ID</th>
                <th className="pb-3 pr-4 font-medium">จำนวนออเดอร์</th>
                <th className="pb-3 pr-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {members.map((member) => (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-950">{member.name}</td>
                  <td className="py-3 pr-4">{member.email}</td>
                  <td className="py-3 pr-4">{member.phone ?? "-"}</td>
                  <td className="py-3 pr-4">{member.lineId ?? "-"}</td>
                  <td className="py-3 pr-4">{member._count.orders}</td>
                  <td className="py-3 pr-4">
                    <DeleteMemberButton userId={member.id} userLabel={member.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
