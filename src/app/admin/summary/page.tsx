import { prisma } from "@/lib/prisma"

export default async function AdminSummaryPage() {
  const [orderCount, pendingCount, approvedCount, memberCount, latestOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PENDING_APPROVAL"] } } }),
    prisma.order.count({ where: { status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.findMany({
      include: { user: true, draw: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const cards = [
    { label: "ออเดอร์ทั้งหมด", value: orderCount },
    { label: "ออเดอร์รอดำเนินการ", value: pendingCount },
    { label: "ออเดอร์ยืนยันแล้ว", value: approvedCount },
    { label: "สมาชิกทั้งหมด", value: memberCount },
  ]

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / SUMMARY</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">สรุปออเดอร์</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          ดูภาพรวมจำนวนออเดอร์ สถานะล่าสุด และรายการที่เข้าระบบล่าสุดในหน้าเดียว
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">ออเดอร์ล่าสุด</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">ลูกค้า</th>
                <th className="pb-3 pr-4 font-medium">ประเภท</th>
                <th className="pb-3 pr-4 font-medium">สถานะ</th>
                <th className="pb-3 pr-4 font-medium">ยอด</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {latestOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4">{order.user.name}</td>
                  <td className="py-3 pr-4">
                    {order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"}
                  </td>
                  <td className="py-3 pr-4">{order.status}</td>
                  <td className="py-3 pr-4">{Number(order.totalTHB).toLocaleString("th-TH")} บาท</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
