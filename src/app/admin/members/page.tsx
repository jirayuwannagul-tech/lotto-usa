import { prisma } from "@/lib/prisma"
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton"
import { MakeReferrerButton } from "@/components/admin/MakeReferrerButton"
import { ensureReferralTables, getReferralMaps } from "@/lib/referrals"

export default async function AdminMembersPage() {
  await ensureReferralTables()

  const members = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  })
  const { profiles, referrals } = await getReferralMaps()
  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile.referralCode]))
  const referralMap = new Map(referrals.map((referral) => [referral.userId, referral]))
  const memberNameMap = new Map(members.map((member) => [member.id, member.name]))

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
                <th className="pb-3 pr-4 font-medium">ผู้แนะนำ</th>
                <th className="pb-3 pr-4 font-medium">รหัสผู้แนะนำ</th>
                <th className="pb-3 pr-4 font-medium">จำนวนออเดอร์</th>
                <th className="pb-3 pr-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {members.map((member) => {
                const referral = referralMap.get(member.id)
                const ownCode = profileMap.get(member.id) ?? null
                const referrerName = referral ? memberNameMap.get(referral.referrerUserId) ?? "-" : "-"

                return (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-950">{member.name}</td>
                    <td className="py-3 pr-4">{member.email}</td>
                    <td className="py-3 pr-4">{member.phone ?? "-"}</td>
                    <td className="py-3 pr-4">{member.lineId ?? "-"}</td>
                    <td className="py-3 pr-4">{referrerName}</td>
                    <td className="py-3 pr-4">
                      {ownCode ? <span className="font-mono text-xs text-emerald-700">{ownCode}</span> : "-"}
                    </td>
                    <td className="py-3 pr-4">{member._count.orders}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <MakeReferrerButton userId={member.id} userName={member.name} existingCode={ownCode} />
                        <DeleteMemberButton userId={member.id} userLabel={member.email} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
