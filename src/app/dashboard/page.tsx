import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

function getStatusLabel(status: string, paymentStatus: string | null) {
  if (status === "PENDING_PAYMENT") return "รอชำระเงิน"
  if (status === "PENDING_APPROVAL" || paymentStatus === "PENDING") return "รอตรวจสอบสลิป"
  if (status === "APPROVED") return "แอดมินอนุมัติแล้ว"
  if (status === "TICKET_UPLOADED") return "อัปโหลดรูปหวยแล้ว"
  if (status === "MATCHED") return "จับคู่ตั๋วแล้ว"
  if (status === "REJECTED" || paymentStatus === "REJECTED") return "รายการถูกปฏิเสธ"
  return status
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/admin")

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      draw: true,
      items: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const totalOrders = orders.length
  const approvedOrders = orders.filter((order) =>
    ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(order.status)
  ).length
  const pendingOrders = orders.filter((order) =>
    ["PENDING_PAYMENT", "PENDING_APPROVAL"].includes(order.status)
  ).length

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-emerald-600">MEMBER DASHBOARD</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                สรุปออเดอร์ของ {session.user.name}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                ใช้หน้านี้เพื่อตรวจสอบสถานะออเดอร์ของคุณ ว่าแอดมินอนุมัติแล้วหรือยัง และอัปโหลดรูปหวยแล้วหรือไม่
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">ออเดอร์ทั้งหมด</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{totalOrders}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">รอดำเนินการ</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{pendingOrders}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">อนุมัติแล้ว</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{approvedOrders}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">รายการออเดอร์ของคุณ</h2>
            <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
              กลับหน้าแรก
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-base text-slate-600">ยังไม่มีออเดอร์ในระบบ เริ่มซื้อหวยจากหน้าแรกได้เลย</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
                          ORDER {order.id.slice(-8).toUpperCase()}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">
                          {order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"}
                        </h3>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>สร้างเมื่อ: {order.createdAt.toLocaleDateString("th-TH")}</p>
                        <p>ยอดรวม: {Number(order.totalTHB).toLocaleString("th-TH")} บาท</p>
                        <p>สถานะออเดอร์: {getStatusLabel(order.status, order.payment?.status ?? null)}</p>
                        <p>สถานะชำระเงิน: {order.payment?.status ?? "ยังไม่มีสลิป"}</p>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-semibold text-slate-700">เลขที่ซื้อ</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                            >
                              {item.mainNumbers} | {item.specialNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                        {getStatusLabel(order.status, order.payment?.status ?? null)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
