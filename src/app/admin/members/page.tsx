import { prisma } from "@/lib/prisma"
import { DeleteMemberButton } from "@/components/admin/DeleteMemberButton"
import { MakeReferrerButton } from "@/components/admin/MakeReferrerButton"
import { ensureReferralTables, getReferralMaps } from "@/lib/referrals"

type MonthlyCommissionSummary = {
  referrerShareTHB: string
  profitTHB: string
  platformShareTHB: string
  commissionCount: number
}

type ReferrerMonthlyRow = {
  referrerUserId: string
  referrerName: string
  referralCode: string
  approvedOrders: number
  referrerShareTHB: string
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} บาท`
}

export default async function AdminMembersPage() {
  await ensureReferralTables()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const nextMonthStart = new Date(monthStart)
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1)

  const members = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  })
  const { profiles, referrals } = await getReferralMaps()
  const monthlySummaryRows = await prisma.$queryRaw<MonthlyCommissionSummary[]>`
    SELECT
      COALESCE(SUM("amountTHB"), 0)::text AS "referrerShareTHB",
      COALESCE(SUM(COALESCE("profitTHB", "amountTHB" * 2)), 0)::text AS "profitTHB",
      COALESCE(SUM(COALESCE("platformShareTHB", "amountTHB")), 0)::text AS "platformShareTHB",
      COUNT(*)::int AS "commissionCount"
    FROM "Commission"
    WHERE "status" IN ('PENDING', 'APPROVED')
      AND "createdAt" >= ${monthStart}
      AND "createdAt" < ${nextMonthStart}
  `
  const topReferrers = await prisma.$queryRaw<ReferrerMonthlyRow[]>`
    SELECT
      c."referrerUserId" AS "referrerUserId",
      u."name" AS "referrerName",
      rp."referralCode" AS "referralCode",
      COUNT(c."id")::int AS "approvedOrders",
      COALESCE(SUM(c."amountTHB"), 0)::text AS "referrerShareTHB"
    FROM "Commission" c
    JOIN "User" u ON u."id" = c."referrerUserId"
    LEFT JOIN "ReferrerProfile" rp ON rp."userId" = c."referrerUserId"
    WHERE c."status" IN ('PENDING', 'APPROVED')
      AND c."createdAt" >= ${monthStart}
      AND c."createdAt" < ${nextMonthStart}
    GROUP BY c."referrerUserId", u."name", rp."referralCode"
    ORDER BY COALESCE(SUM(c."amountTHB"), 0) DESC
    LIMIT 10
  `

  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile.referralCode]))
  const referralMap = new Map(referrals.map((referral) => [referral.userId, referral]))
  const memberNameMap = new Map(members.map((member) => [member.id, member.name]))
  const monthlySummary = monthlySummaryRows[0] ?? {
    referrerShareTHB: "0",
    profitTHB: "0",
    platformShareTHB: "0",
    commissionCount: 0,
  }
  const monthlyCards = [
    { label: "กำไรเดือนนี้", value: formatCurrency(Number(monthlySummary.profitTHB)) },
    { label: "ผู้แนะนำได้", value: formatCurrency(Number(monthlySummary.referrerShareTHB)) },
    { label: "ระบบเหลือ", value: formatCurrency(Number(monthlySummary.platformShareTHB)) },
    { label: "ออเดอร์มีค่าคอม", value: String(monthlySummary.commissionCount) },
  ]

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / MEMBERS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">รายชื่อสมาชิก</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          ดูรายชื่อสมาชิก ข้อมูลติดต่อ และจำนวนออเดอร์ที่แต่ละคนเคยสร้างไว้
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {monthlyCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">สรุปค่าคอมผู้แนะนำรายเดือน</h3>
            <p className="mt-1 text-sm text-slate-500">ระบบแบ่งกำไรจากค่าบริการให้ผู้แนะนำแบบ 50/50</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">ผู้แนะนำ</th>
                <th className="pb-3 pr-4 font-medium">รหัสผู้แนะนำ</th>
                <th className="pb-3 pr-4 font-medium">ออเดอร์ที่ได้คอม</th>
                <th className="pb-3 pr-4 font-medium">ค่าคอมเดือนนี้</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-slate-500">
                    เดือนนี้ยังไม่มีค่าคอมผู้แนะนำ
                  </td>
                </tr>
              ) : (
                topReferrers.map((referrer) => (
                  <tr key={referrer.referrerUserId} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-950">{referrer.referrerName}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-emerald-700">{referrer.referralCode}</td>
                    <td className="py-3 pr-4">{referrer.approvedOrders}</td>
                    <td className="py-3 pr-4">{formatCurrency(Number(referrer.referrerShareTHB))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
