import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getExchangeRate } from "@/lib/exchange-rate"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CutoffCountdown } from "@/components/shared/CutoffCountdown"
import LogoutButton from "@/components/shared/LogoutButton"

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  })
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const actionableStatuses = new Set(["APPROVED", "TICKET_UPLOADED", "MATCHED"])

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const rate = await getExchangeRate()

  const openDraws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const myOrders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { draw: true, items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const pendingOrders = myOrders.filter((order) => order.status === "PENDING_PAYMENT")
  const actionableOrders = myOrders.filter((order) => actionableStatuses.has(order.status))
  const totalSpentTHB = myOrders.reduce((sum, order) => sum + Number(order.totalTHB), 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-emerald-600">
              CUSTOMER DASHBOARD
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">บัญชีลูกค้า</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
            >
              กลับหน้าแรก
            </Link>
            <LogoutButton className="border border-slate-200 bg-white px-4 text-slate-600 hover:bg-slate-50 hover:text-slate-950" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ภาพรวมบัญชี</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              สวัสดี, {session.user.name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              หน้านี้รวมทุกอย่างไว้ในหน้าเดียว ทั้งรายการที่ซื้อ รายการที่รอชำระ และปุ่มซื้อเพิ่ม
              ส่วนข้อมูลบัญชีรับโอนจะอยู่เฉพาะหน้าชำระเงินของแต่ละรายการ
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">ออเดอร์ทั้งหมด</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{myOrders.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">รอชำระเงิน</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-600">{pendingOrders.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">ชำระแล้ว / รอดำเนินการ</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600">
                  {actionableOrders.length}
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">สิ่งที่ต้องทำตอนนี้</p>
            {pendingOrders.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  คุณมี {pendingOrders.length} รายการที่ยังไม่ได้ชำระเงิน
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  เปิดหน้าชำระเงินของแต่ละรายการเพื่อดูเลขที่บัญชี ยอดโอน และแนบสลิป
                </p>
                <Link
                  href={`/orders/${pendingOrders[0].id}/pay`}
                  className="mt-4 inline-flex rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                >
                  ไปชำระรายการล่าสุด
                </Link>
              </div>
            ) : openDraws.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">ตอนนี้ไม่มีรายการค้างชำระ</p>
                <p className="mt-2 text-sm leading-6 text-emerald-700">
                  ถ้าต้องการซื้อเพิ่ม สามารถเลือกเกมที่เปิดอยู่ต่อได้ทันทีจากหน้าด้านล่าง
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">ตอนนี้ยังไม่มีงวดที่เปิดขาย</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">กลับมาเช็กใหม่ได้จากหน้าแรกเมื่อมีงวดถัดไป</p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">อัตราแลกเปลี่ยนล่าสุด</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">$1 = {rate.toFixed(2)} บาท</p>
              {totalSpentTHB > 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  ยอดรวมที่สร้างออเดอร์แล้ว {totalSpentTHB.toFixed(0)} บาท
                </p>
              )}
            </div>
          </aside>
        </section>

        {pendingOrders.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">รอชำระเงิน</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  รายการที่ต้องทำต่อ
                </h2>
              </div>
              <p className="text-sm text-slate-500">ข้อมูลรับโอนจะแสดงในหน้าชำระเงินของแต่ละรายการ</p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {pendingOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{getDrawLabel(order.draw.type)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        งวด {formatFullDate(order.draw.drawDate)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white bg-white p-3">
                        <div className="flex flex-wrap gap-2">
                          {item.mainNumbers.split(",").map((n) => (
                            <span
                              key={n}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900"
                            >
                              {n}
                            </span>
                          ))}
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                            {item.specialNumber}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                    <span>{order.items.length} ใบ</span>
                    <span className="text-lg font-semibold text-slate-950">
                      {Number(order.totalTHB).toFixed(0)} บาท
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}/pay`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    ไปหน้าชำระเงิน
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">ซื้อเพิ่ม</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                งวดที่เปิดรับอยู่ตอนนี้
              </h2>
            </div>
            <Link href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
              กลับไปเลือกเลขจากหน้าแรก
            </Link>
          </div>

          {openDraws.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-500">ยังไม่มีงวดที่เปิดรับ</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {openDraws.map((draw) => {
                const pricePerTicket = 3.5
                return (
                  <article key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{getDrawLabel(draw.type)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          งวด {formatFullDate(draw.drawDate)}
                        </p>
                      </div>
                      <CutoffCountdown
                        cutoffAt={draw.cutoffAt.toISOString()}
                        drawDate={draw.drawDate.toISOString()}
                        drawType={draw.type}
                        compact
                      />
                    </div>

                    {draw.jackpot && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">แจ็กพอต</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                          {draw.jackpot}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span>ราคาต่อใบประมาณ ${pricePerTicket.toFixed(2)}</span>
                      <span>{(pricePerTicket * rate).toFixed(0)} บาท</span>
                    </div>

                    <Link
                      href={`/orders/new?drawId=${draw.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                    >
                      เลือกเลขสำหรับงวดนี้
                    </Link>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">รายการทั้งหมด</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                ประวัติการซื้อของคุณ
              </h2>
            </div>
            {myOrders.length > 0 && (
              <p className="text-sm text-slate-500">แสดงล่าสุด {myOrders.length} รายการ</p>
            )}
          </div>

          {myOrders.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-500">ยังไม่มีออเดอร์ในบัญชีนี้</p>
              <Link href="/" className="mt-4 inline-flex text-sm font-medium text-emerald-600 hover:text-emerald-500">
                ไปเลือกเลขจากหน้าแรก
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {myOrders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{getDrawLabel(order.draw.type)}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        สร้างเมื่อ {formatShortDate(order.createdAt)} • งวด {formatShortDate(order.draw.drawDate)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white bg-white p-3">
                        <div className="flex flex-wrap gap-2">
                          {item.mainNumbers.split(",").map((n) => (
                            <span
                              key={n}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-900"
                            >
                              {n}
                            </span>
                          ))}
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                            {item.specialNumber}
                          </span>
                          {item.matchedAt && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                              จับคู่ตั๋วแล้ว
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">
                      {order.items.length} ใบ • ยอด {Number(order.totalTHB).toFixed(0)} บาท
                    </div>
                    {order.status === "PENDING_PAYMENT" ? (
                      <Link
                        href={`/orders/${order.id}/pay`}
                        className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        ไปหน้าชำระเงิน
                      </Link>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {order.status === "PENDING_APPROVAL" && "ส่งสลิปแล้ว รอผู้ดูแลตรวจสอบ"}
                        {order.status === "APPROVED" && "ชำระแล้ว ระบบกำลังเตรียมซื้อให้"}
                        {order.status === "TICKET_UPLOADED" && "อัปโหลดตั๋วแล้ว กำลังจับคู่เลข"}
                        {order.status === "MATCHED" && "อัปเดตตั๋วเรียบร้อย ดูผลได้จากรายการนี้"}
                        {order.status === "REJECTED" && "รายการถูกปฏิเสธ กรุณาตรวจสอบใหม่"}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
