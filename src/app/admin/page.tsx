import { prisma } from "@/lib/prisma"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { AdminApproveButton } from "@/components/admin/AdminApproveButton"

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
}

export default async function AdminPage() {
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

  const allOrders = draws.flatMap((draw) =>
    draw.orders.map((order) => ({
      ...order,
      drawMeta: {
        type: draw.type,
      },
    }))
  )
  const pendingPayments = allOrders.filter((order) => order.status === "PENDING_APPROVAL")
  const approvedOrders = allOrders.filter((order) =>
    ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(order.status)
  )
  const matchedOrders = allOrders.filter((order) => order.status === "MATCHED")
  const totalRevenueTHB = approvedOrders.reduce((sum, order) => sum + Number(order.totalTHB), 0)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN OVERVIEW</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">ภาพรวมการปฏิบัติงาน</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              หน้านี้สรุปรายการที่รอตรวจสลิป ออเดอร์ที่ชำระแล้ว และงวดต่าง ๆ ไว้ในที่เดียวเพื่อให้ทำงานต่อได้เร็ว
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">REVENUE APPROVED</p>
            <p className="mt-2 text-3xl font-semibold">
              {totalRevenueTHB.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "ออเดอร์ทั้งหมด", value: allOrders.length },
          { label: "รอตรวจสลิป", value: pendingPayments.length },
          { label: "ชำระแล้ว", value: approvedOrders.length },
          { label: "จับคู่ตั๋วแล้ว", value: matchedOrders.length },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
          </article>
        ))}
      </div>

      {pendingPayments.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">รอตรวจสลิป</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                รายการที่ต้องอนุมัติ
              </h2>
            </div>
            <p className="text-sm text-slate-500">ตรวจสลิปก่อนส่งต่อให้ทีมซื้อจริง</p>
          </div>

          <div className="mt-5 space-y-4">
            {pendingPayments.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{order.user.name}</p>
                      {order.user.phone && <span className="text-sm text-slate-500">{order.user.phone}</span>}
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{getDrawLabel(order.drawMeta.type)}</p>

                    <div className="mt-4 space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-white bg-white p-3">
                          <div className="flex flex-wrap gap-2">
                            {item.mainNumbers.split(",").map((n) => (
                              <span
                                key={n}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-900"
                              >
                                {n}
                              </span>
                            ))}
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                              {item.specialNumber}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-sm text-slate-600">
                      {order.items.length} ใบ • {Number(order.totalTHB).toFixed(0)} บาท
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                    {order.payment?.slipUrl && (
                      <a
                        href={`/api/payments/${order.payment.id}/slip`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                      >
                        ดูสลิป
                      </a>
                    )}
                    {order.payment && <AdminApproveButton paymentId={order.payment.id} orderId={order.id} />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">แยกตามงวด</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            รายการทั้งหมดตามรอบการออกรางวัล
          </h2>
        </div>

        <div className="mt-5 space-y-5">
          {draws.map((draw) => {
            if (draw.orders.length === 0) return null

            return (
              <article key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{getDrawLabel(draw.type)}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      งวด{" "}
                      {new Date(draw.drawDate).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      draw.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {draw.isOpen ? "เปิดขาย" : "ปิดงวดแล้ว"}
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">ลูกค้า</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">เลขที่ซื้อ</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-500">จำนวนใบ</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-500">ยอด</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-500">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draw.orders.map((order) => (
                        <tr key={order.id} className="border-t border-slate-200 align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-950">{order.user.name}</p>
                            {order.user.phone && <p className="text-xs text-slate-500">{order.user.phone}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div key={item.id} className="font-mono text-xs text-slate-600">
                                  {item.mainNumbers} • {item.specialNumber}
                                  {item.matchedAt && <span className="ml-2 text-emerald-600">จับคู่แล้ว</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-700">{order.items.length}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-950">
                            {Number(order.totalTHB).toFixed(0)} ฿
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
