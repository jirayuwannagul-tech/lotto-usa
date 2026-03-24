import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { StatusBadge } from "@/components/shared/StatusBadge"
import LogoutButton from "@/components/shared/LogoutButton"
import { AdminApproveButton } from "@/components/admin/AdminApproveButton"
import { AdminSummaryButton } from "@/components/admin/AdminSummaryButton"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const draws = await prisma.draw.findMany({
    orderBy: { drawDate: "desc" },
    include: {
      orders: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
          items: true,
          payment: true,
        },
      },
    },
    take: 10,
  })

  const allOrders = draws.flatMap((d) => d.orders)
  const pendingPayments = allOrders.filter((o) => o.status === "PENDING_APPROVAL")
  const approvedOrders = allOrders.filter((o) =>
    ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)
  )
  const matchedOrders = allOrders.filter((o) => o.status === "MATCHED")
  const totalRevenueTHB = approvedOrders.reduce((s, o) => s + Number(o.totalTHB), 0)

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0f1e]/90 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
            <span className="text-white font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/draws"
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/8"
            >
              + งวด
            </Link>
            <Link
              href="/admin/tickets"
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/8"
            >
              📷 ตั๋ว
            </Link>
            <AdminSummaryButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ออเดอร์ทั้งหมด", value: allOrders.length, color: "text-white", sub: null },
            { label: "รอตรวจสลิป", value: pendingPayments.length, color: "text-orange-400", sub: pendingPayments.length > 0 ? "⚠️ รีบตรวจ" : null },
            { label: "ชำระแล้ว", value: approvedOrders.length, color: "text-blue-400", sub: null },
            { label: "ซื้อตั๋วแล้ว", value: matchedOrders.length, color: "text-green-400", sub: null },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
              {s.sub && <p className="text-orange-400/70 text-xs mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Revenue summary */}
        <div className="bg-gradient-to-r from-green-950/50 to-teal-950/50 border border-green-800/20 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-green-400/60 text-xs uppercase tracking-wider">รายได้รวม (ที่อนุมัติแล้ว)</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalRevenueTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿
            </p>
          </div>
          <div className="text-3xl">💰</div>
        </div>

        {/* Pending approval */}
        {pendingPayments.length > 0 && (
          <div>
            <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
              รอตรวจสลิป ({pendingPayments.length})
            </h2>
            <div className="space-y-3">
              {pendingPayments.map((order) => (
                <div key={order.id} className="bg-orange-500/5 border border-orange-500/15 rounded-2xl p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-white font-semibold truncate">{order.user.name}</p>
                        {order.user.phone && (
                          <span className="text-white/30 text-xs shrink-0">{order.user.phone}</span>
                        )}
                      </div>
                      <div className="space-y-1 mb-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-1.5 flex-wrap">
                            {item.mainNumbers.split(",").map((n) => (
                              <span key={n} className="w-7 h-7 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-xs font-bold text-white/80">
                                {n}
                              </span>
                            ))}
                            <span className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-300">
                              {item.specialNumber}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-white/40 text-sm">
                        {order.items.length} ใบ — {Number(order.totalTHB).toFixed(0)} ฿
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {order.payment?.slipUrl && (
                        <a
                          href={order.payment.slipUrl}
                          target="_blank"
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          🖼 ดูสลิป
                        </a>
                      )}
                      {order.payment && (
                        <AdminApproveButton paymentId={order.payment.id} orderId={order.id} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders by draw */}
        {draws.map((draw) => {
          if (draw.orders.length === 0) return null
          const drawRevenue = draw.orders
            .filter((o) => ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status))
            .reduce((s, o) => s + Number(o.totalTHB), 0)
          const isPowerball = draw.type === "POWERBALL"

          return (
            <div key={draw.id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  {isPowerball ? "🔴 Powerball" : "🔵 Mega Millions"}
                  <span className="text-white/40 font-normal text-sm">
                    งวด {new Date(draw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${draw.isOpen ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"}`}>
                    {draw.isOpen ? "เปิด" : "ปิด"}
                  </span>
                </h2>
                {drawRevenue > 0 && (
                  <span className="text-green-400 text-sm font-semibold">
                    {drawRevenue.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿
                  </span>
                )}
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left py-3 px-4 text-white/30 font-medium text-xs">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-white/30 font-medium text-xs">เลขที่จอง</th>
                      <th className="text-center py-3 px-3 text-white/30 font-medium text-xs">ใบ</th>
                      <th className="text-right py-3 px-4 text-white/30 font-medium text-xs">ยอด</th>
                      <th className="text-center py-3 px-4 text-white/30 font-medium text-xs">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draw.orders.map((order, idx) => (
                      <tr
                        key={order.id}
                        className={`border-b border-white/5 hover:bg-white/3 transition-colors ${idx === draw.orders.length - 1 ? "border-b-0" : ""}`}
                      >
                        <td className="py-3 px-4">
                          <p className="text-white text-sm">{order.user.name}</p>
                          {order.user.phone && (
                            <p className="text-white/30 text-xs">{order.user.phone}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {order.items.map((item) => (
                            <div key={item.id} className="font-mono text-white/60 text-xs flex items-center gap-1">
                              {item.mainNumbers}
                              <span className={isPowerball ? "text-red-400" : "text-blue-400"}>
                                ●{item.specialNumber}
                              </span>
                              {item.matchedAt && <span className="text-green-400">✓</span>}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-3 text-center text-white/50 text-sm">
                          {order.items.length}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-medium text-sm">
                          {Number(order.totalTHB).toFixed(0)} ฿
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white/3">
                      <td colSpan={2} className="py-2.5 px-4 text-right text-white/30 text-xs">รวม</td>
                      <td className="py-2.5 px-3 text-center text-white font-bold text-sm">
                        {draw.orders.reduce((s, o) => s + o.items.length, 0)} ใบ
                      </td>
                      <td className="py-2.5 px-4 text-right text-white font-bold text-sm">
                        {draw.orders.reduce((s, o) => s + Number(o.totalTHB), 0).toFixed(0)} ฿
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        })}

      </main>
    </div>
  )
}
