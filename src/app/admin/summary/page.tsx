import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระ",
  PENDING_APPROVAL: "รอยืนยันสลิป",
  APPROVED: "อนุมัติแล้ว",
  TICKET_UPLOADED: "อัปรูปแล้ว",
  MATCHED: "จับคู่แล้ว",
  REJECTED: "ปฏิเสธ",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-slate-100 text-slate-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  TICKET_UPLOADED: "bg-purple-100 text-purple-700",
  MATCHED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
}

function toLA(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }) // YYYY-MM-DD
}

function formatDateThai(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("th-TH", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "2-digit",
  })
}

export default async function AdminSummaryPage() {
  const orders = await prisma.order.findMany({
    include: { user: true, draw: true },
    orderBy: { createdAt: "desc" },
  })

  // Group by LA date
  const grouped = new Map<string, typeof orders>()
  for (const order of orders) {
    const key = toLA(order.createdAt)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(order)
  }

  const today = toLA(new Date())
  const sortedDays = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / SUMMARY</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">สรุปออเดอร์</h2>
        <p className="mt-2 text-sm text-slate-500">แสดงออเดอร์แยกตามวัน (เวลา Los Angeles)</p>
      </div>

      {sortedDays.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
          ยังไม่มีออเดอร์ในระบบ
        </div>
      )}

      {sortedDays.map((day) => {
        const dayOrders = grouped.get(day)!
        const isToday = day === today
        const totalTHB = dayOrders.reduce((s, o) => s + Number(o.totalTHB), 0)
        const approvedCount = dayOrders.filter((o) =>
          ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)
        ).length
        const pendingCount = dayOrders.filter((o) =>
          ["PENDING_PAYMENT", "PENDING_APPROVAL"].includes(o.status)
        ).length
        const rejectedCount = dayOrders.filter((o) => o.status === "REJECTED").length

        return (
          <div
            key={day}
            className={`rounded-3xl border bg-white shadow-sm ${isToday ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}
          >
            {/* Day header */}
            <div className={`flex items-center justify-between rounded-t-3xl px-8 py-5 ${isToday ? "bg-blue-50" : "bg-slate-50"}`}>
              <div>
                {isToday && (
                  <span className="mb-1 inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                    วันนี้
                  </span>
                )}
                <h3 className="text-lg font-semibold text-slate-900">{formatDateThai(day)}</h3>
              </div>
              <div className="flex gap-6 text-sm text-right">
                <div>
                  <p className="text-slate-400">ทั้งหมด</p>
                  <p className="font-semibold text-slate-900">{dayOrders.length} ออเดอร์</p>
                </div>
                <div>
                  <p className="text-slate-400">ยอดรวม</p>
                  <p className="font-semibold text-slate-900">{totalTHB.toLocaleString("th-TH")} ฿</p>
                </div>
                <div>
                  <p className="text-slate-400">อนุมัติ</p>
                  <p className="font-semibold text-emerald-600">{approvedCount}</p>
                </div>
                <div>
                  <p className="text-slate-400">รอ</p>
                  <p className="font-semibold text-amber-600">{pendingCount}</p>
                </div>
                {rejectedCount > 0 && (
                  <div>
                    <p className="text-slate-400">ปฏิเสธ</p>
                    <p className="font-semibold text-red-600">{rejectedCount}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Orders table */}
            <div className="overflow-x-auto px-8 pb-6">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-400">
                  <tr>
                    <th className="pb-3 pt-5 pr-4 font-medium">ลูกค้า</th>
                    <th className="pb-3 pt-5 pr-4 font-medium">ประเภท</th>
                    <th className="pb-3 pt-5 pr-4 font-medium">งวด</th>
                    <th className="pb-3 pt-5 pr-4 font-medium">สถานะ</th>
                    <th className="pb-3 pt-5 pr-4 font-medium text-right">ยอด</th>
                  </tr>
                </thead>
                <tbody>
                  {dayOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="py-3 pr-4 font-medium text-slate-900">{order.user.name}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {order.draw.drawDate.toLocaleDateString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-700">
                        {Math.round(Number(order.totalTHB)).toLocaleString("th-TH")} ฿
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </section>
  )
}
