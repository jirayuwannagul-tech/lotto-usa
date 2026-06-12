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

function drawLabel(type: string) {
  return type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"
}

function drawDateThai(date: Date) {
  return date.toLocaleDateString("th-TH", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "2-digit",
  })
}

function monthKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 7) // YYYY-MM
}

function monthThai(key: string) {
  const d = new Date(key + "-15T12:00:00Z")
  return d.toLocaleDateString("th-TH", { month: "long", year: "2-digit" })
}

type DrawWithOrders = Awaited<ReturnType<typeof loadDraws>>[number]

async function loadDraws() {
  return prisma.draw.findMany({
    orderBy: { drawDate: "desc" },
    include: {
      orders: {
        include: { user: true, items: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
}

function DrawOrdersTable({ orders }: { orders: DrawWithOrders["orders"] }) {
  if (orders.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">ไม่มีออเดอร์ในงวดนี้</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-slate-400">
          <tr>
            <th className="pb-3 pt-4 pr-4 font-medium">ลูกค้า</th>
            <th className="pb-3 pt-4 pr-4 font-medium">ใบ</th>
            <th className="pb-3 pt-4 pr-4 font-medium">สถานะ</th>
            <th className="pb-3 pt-4 pr-4 font-medium text-right">ยอด</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-slate-100">
              <td className="py-2.5 pr-4 font-medium text-slate-900">{order.user.name}</td>
              <td className="py-2.5 pr-4 text-slate-500">{order.items.length} ใบ</td>
              <td className="py-2.5 pr-4">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-700">
                {Math.round(Number(order.totalTHB)).toLocaleString("th-TH")} ฿
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DrawStat({ label, value, color = "text-slate-900" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-right">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  )
}

export default async function AdminSummaryPage() {
  const draws = await loadDraws()
  const now = new Date()

  const activeDraws = draws.filter((d) => d.isOpen || d.drawDate >= now)
  const pastDraws = draws.filter((d) => !d.isOpen && d.drawDate < now)

  // Monthly summary from past draws
  const monthlyMap = new Map<string, { orders: number; tickets: number; totalTHB: number; approved: number }>()
  for (const draw of pastDraws) {
    const key = monthKey(draw.drawDate)
    if (!monthlyMap.has(key)) monthlyMap.set(key, { orders: 0, tickets: 0, totalTHB: 0, approved: 0 })
    const m = monthlyMap.get(key)!
    const validOrders = draw.orders.filter((o) => o.status !== "REJECTED")
    m.orders += validOrders.length
    m.tickets += validOrders.reduce((s, o) => s + o.items.length, 0)
    m.totalTHB += validOrders.reduce((s, o) => s + Number(o.totalTHB), 0)
    m.approved += draw.orders.filter((o) => ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)).length
  }
  const months = Array.from(monthlyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / SUMMARY</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">สรุปออเดอร์</h2>
        <p className="mt-2 text-sm text-slate-500">แยกตามงวด — งวดปัจจุบันและประวัติย้อนหลัง</p>
      </div>

      {/* ── Active Draws ── */}
      {activeDraws.length > 0 && (
        <div className="space-y-4">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-widest text-blue-600">งวดปัจจุบัน</h3>
          {activeDraws.map((draw) => {
            const total = draw.orders.reduce((s, o) => s + Number(o.totalTHB), 0)
            const approved = draw.orders.filter((o) => ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)).length
            const pending = draw.orders.filter((o) => ["PENDING_PAYMENT", "PENDING_APPROVAL"].includes(o.status)).length
            return (
              <div key={draw.id} className="rounded-3xl border-2 border-blue-300 bg-white shadow-sm ring-4 ring-blue-50">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-3xl bg-blue-50 px-8 py-5">
                  <div>
                    <span className="mb-1 inline-block rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">เปิดอยู่</span>
                    <h4 className="text-lg font-semibold text-slate-900">{drawLabel(draw.type)}</h4>
                    <p className="text-sm text-slate-500">งวด {drawDateThai(draw.drawDate)}</p>
                  </div>
                  <div className="flex gap-6">
                    <DrawStat label="ออเดอร์" value={draw.orders.length} />
                    <DrawStat label="ยอดรวม" value={`${Math.round(total).toLocaleString("th-TH")} ฿`} />
                    <DrawStat label="อนุมัติ" value={approved} color="text-emerald-600" />
                    <DrawStat label="รอ" value={pending} color="text-amber-600" />
                  </div>
                </div>
                <div className="px-8 pb-6">
                  <DrawOrdersTable orders={draw.orders} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Past Draws ── */}
      {pastDraws.length > 0 && (
        <div className="space-y-4">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">ประวัติงวดที่ผ่านมา</h3>
          {pastDraws.map((draw) => {
            const total = draw.orders.filter((o) => o.status !== "REJECTED").reduce((s, o) => s + Number(o.totalTHB), 0)
            const approved = draw.orders.filter((o) => ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)).length
            const rejected = draw.orders.filter((o) => o.status === "REJECTED").length
            const hasWinner = draw.winningMain !== null
            return (
              <div key={draw.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-3xl bg-slate-50 px-8 py-5">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">{drawLabel(draw.type)}</h4>
                    <p className="text-sm text-slate-500">งวด {drawDateThai(draw.drawDate)}</p>
                    {hasWinner && (
                      <p className="mt-1 text-xs text-slate-400">
                        ผล: <span className="font-mono text-slate-700">{draw.winningMain} | {draw.winningSpecial}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-6">
                    <DrawStat label="ออเดอร์" value={draw.orders.length} />
                    <DrawStat label="ยอดรวม" value={`${Math.round(total).toLocaleString("th-TH")} ฿`} />
                    <DrawStat label="อนุมัติ" value={approved} color="text-emerald-600" />
                    {rejected > 0 && <DrawStat label="ปฏิเสธ" value={rejected} color="text-red-500" />}
                    {!hasWinner && <DrawStat label="ผล" value="ยังไม่มี" color="text-amber-500" />}
                  </div>
                </div>
                {draw.orders.length > 0 && (
                  <div className="px-8 pb-6">
                    <DrawOrdersTable orders={draw.orders} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Monthly Summary ── */}
      {months.length > 0 && (
        <div className="space-y-4">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">สรุปรายเดือน</h3>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-400">
                <tr>
                  <th className="px-8 py-4 font-medium">เดือน</th>
                  <th className="px-4 py-4 font-medium text-right">ออเดอร์</th>
                  <th className="px-4 py-4 font-medium text-right">ใบหวย</th>
                  <th className="px-4 py-4 font-medium text-right">อนุมัติ</th>
                  <th className="px-8 py-4 font-medium text-right">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {months.map(([key, m]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-8 py-3 font-medium text-slate-900">{monthThai(key)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{m.orders}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{m.tickets}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{m.approved}</td>
                    <td className="px-8 py-3 text-right font-semibold text-slate-900">
                      {Math.round(m.totalTHB).toLocaleString("th-TH")} ฿
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
