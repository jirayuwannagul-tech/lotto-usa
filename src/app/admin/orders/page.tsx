import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminApproveButton } from "@/components/admin/AdminApproveButton"

function formatOrderDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function paymentStatusLabel(status: string | null) {
  if (status === "PENDING") return "รอตรวจสอบ"
  if (status === "APPROVED") return "อนุมัติแล้ว"
  if (status === "REJECTED") return "ปฏิเสธแล้ว"
  return "ยังไม่มีสลิป"
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: true,
      draw: true,
      items: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / ORDERS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">ยืนยันออเดอร์ลูกค้า</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          ดูออเดอร์แบบตาราง ตรวจสอบเจ้าของออเดอร์ เลขที่ซื้อ สลิป และกดอนุมัติหรือปฏิเสธได้จากหน้าเดียว
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-400">
              <tr>
                <th className="pb-4 pr-4 font-medium">วันที่</th>
                <th className="pb-4 pr-4 font-medium">Order ID</th>
                <th className="pb-4 pr-4 font-medium">ชื่อลูกค้า</th>
                <th className="pb-4 pr-4 font-medium">อีเมล</th>
                <th className="pb-4 pr-4 font-medium">หวย</th>
                <th className="pb-4 pr-4 font-medium">เลขที่ซื้อ</th>
                <th className="pb-4 pr-4 font-medium">ยอดรวม</th>
                <th className="pb-4 pr-4 font-medium">สถานะชำระเงิน</th>
                <th className="pb-4 pr-4 font-medium">สลิป</th>
                <th className="pb-4 pr-0 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {orders.map((order) => {
                const itemLines = order.items.map((item) => `${item.mainNumbers} | ${item.specialNumber}`)
                const previewLines = itemLines.slice(0, 3)
                const hasMoreLines = itemLines.length > 3

                return (
                  <tr key={order.id} className="border-b border-slate-100 align-top">
                    <td className="py-4 pr-4">{formatOrderDate(order.createdAt)}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-950">{order.id.slice(-8).toUpperCase()}</td>
                    <td className="py-4 pr-4 font-medium text-slate-950">{order.user.name}</td>
                    <td className="py-4 pr-4">{order.user.email}</td>
                    <td className="py-4 pr-4">{order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"}</td>
                    <td className="py-4 pr-4">
                      <div className="min-w-[240px] rounded-2xl bg-slate-50 p-3">
                        <div className="space-y-1 font-mono text-xs text-slate-700">
                          {previewLines.map((line, index) => (
                            <p key={`${order.id}-preview-${index}`}>{line}</p>
                          ))}
                        </div>
                        {hasMoreLines && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-semibold text-sky-700">
                              ดูเพิ่มเติม
                            </summary>
                            <div className="mt-2 space-y-1 font-mono text-xs text-slate-700">
                              {itemLines.slice(3).map((line, index) => (
                                <p key={`${order.id}-full-${index}`}>{line}</p>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-medium text-slate-950">
                      {Number(order.totalTHB).toLocaleString("th-TH")} บาท
                    </td>
                    <td className="py-4 pr-4">{paymentStatusLabel(order.payment?.status ?? null)}</td>
                    <td className="py-4 pr-4">
                      {order.payment ? (
                        <div className="space-y-2">
                          <Link
                            href={`/api/payments/${order.payment.id}/slip`}
                            target="_blank"
                            className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            ดูสลิป
                          </Link>
                          {order.payment.rejectNote && (
                            <p className="max-w-[180px] text-xs text-rose-600">{order.payment.rejectNote}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">ยังไม่มีสลิป</span>
                      )}
                    </td>
                    <td className="py-4 pr-0">
                      {order.payment?.status === "PENDING" ? (
                        <AdminApproveButton paymentId={order.payment.id} orderId={order.id} />
                      ) : (
                        <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                          {order.payment?.status === "APPROVED" ? "ยืนยันแล้ว" : "รอสลิป"}
                        </span>
                      )}
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
