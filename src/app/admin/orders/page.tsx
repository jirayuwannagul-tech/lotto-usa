import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminApproveButton } from "@/components/admin/AdminApproveButton"

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
          ตรวจสอบออเดอร์ล่าสุด ดูเลขที่ลูกค้าสั่งซื้อ และกดยืนยันรับออเดอร์เมื่อชำระเงินเรียบร้อยแล้ว
        </p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                    ORDER ID {order.id.slice(-8).toUpperCase()}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{order.user.name}</h3>
                  <p className="text-sm text-slate-500">{order.user.email}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>ประเภท: {order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"}</p>
                  <p>สถานะ: {order.status}</p>
                  <p>ยอดรวม: {Number(order.totalTHB).toLocaleString("th-TH")} บาท</p>
                  <p>ชำระเงิน: {order.payment?.status ?? "ยังไม่มีสลิป"}</p>
                </div>
                {order.payment && (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/api/payments/${order.payment.id}/slip`}
                      target="_blank"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      ดูสลิป
                    </Link>
                    {order.payment.rejectNote && (
                      <span className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
                        เหตุผลที่ปฏิเสธ: {order.payment.rejectNote}
                      </span>
                    )}
                  </div>
                )}
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">เลขที่ลูกค้าซื้อ</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                      >
                        {item.mainNumbers} | {item.specialNumber}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {order.payment?.status === "PENDING" ? (
                  <AdminApproveButton paymentId={order.payment.id} orderId={order.id} />
                ) : (
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500">
                    {order.payment?.status === "APPROVED" ? "ยืนยันแล้ว" : "รอสลิป"}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
