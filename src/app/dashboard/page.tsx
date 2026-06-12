import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
  })
}

function formatThaiDateTime(date: Date) {
  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }) + " น."
}

function getStatusLabel(status: string, paymentStatus: string | null) {
  // order status takes priority — check advanced states first
  if (status === "MATCHED") return "จับคู่ตั๋วแล้ว"
  if (status === "TICKET_UPLOADED") return "อัปโหลดรูปหวยแล้ว"
  if (status === "APPROVED") return "แอดมินอนุมัติแล้ว — รอแอดมินส่งหลักฐานการซื้อ"
  if (status === "REJECTED" || paymentStatus === "REJECTED") return "รายการถูกปฏิเสธ"
  if (status === "PENDING_PAYMENT") return "รอชำระเงิน"
  if (status === "PENDING_APPROVAL" || paymentStatus === "PENDING") return "รอแอดมินยืนยันสลิป"
  return status
}

function getPrizeLabel(type: string, matchMain: number, matchSpecial: boolean): string | null {
  const special = type === "POWERBALL" ? "Powerball" : "Mega Ball"
  if (matchMain === 5 && matchSpecial) return "แจ็คพอต"
  if (matchMain === 5) return "Match 5"
  if (matchMain === 4 && matchSpecial) return `Match 4+${special}`
  if (matchMain === 4) return "Match 4"
  if (matchMain === 3 && matchSpecial) return `Match 3+${special}`
  if (matchMain === 3) return "Match 3"
  if (matchMain === 2 && matchSpecial) return `Match 2+${special}`
  if (matchMain === 1 && matchSpecial) return `Match 1+${special}`
  if (matchMain === 0 && matchSpecial) return `Match ${special}`
  return null
}

function getResultSummary(order: {
  draw: { type: string; winningMain: string | null; winningSpecial: string | null }
  items: { id: string; mainNumbers: string; specialNumber: string }[]
}) {
  if (!order.draw.winningMain || !order.draw.winningSpecial) {
    return {
      title: "รอสรุปผลรางวัล",
      detail: "งวดนี้ยังไม่ประกาศผลรางวัล",
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    }
  }

  const winningMain = order.draw.winningMain.split(",").map((n) => n.trim()).sort()
  const winningSpecial = order.draw.winningSpecial.trim()
  const winningItems = order.items
    .map((item) => {
      const itemMain = item.mainNumbers.split(",").map((n) => n.trim()).sort()
      const matchMain = itemMain.filter((n) => winningMain.includes(n)).length
      const matchSpecial = item.specialNumber.trim() === winningSpecial
      const prize = getPrizeLabel(order.draw.type, matchMain, matchSpecial)
      return prize ? `${item.mainNumbers} | ${item.specialNumber} → ${prize}` : null
    })
    .filter((value): value is string => Boolean(value))

  if (winningItems.length === 0) {
    return {
      title: "ไม่ถูกรางวัล",
      detail: "ระบบตรวจแล้ว งวดนี้ยังไม่พบเลขที่ถูกรางวัล",
      tone: "border-white/10 bg-white/5 text-white/50",
    }
  }

  return {
    title: "ถูกรางวัล! 🏆",
    detail: winningItems.join("\n"),
    tone: "border-[#c9a84c]/30 bg-[#c9a84c]/10 text-[#c9a84c]",
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/login")

  await syncUpcomingDraws(prisma)
  const now = new Date()

  const [userWithWallet, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { walletBalance: true } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        draw: true,
        items: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const walletBalance = Number(userWithWallet?.walletBalance ?? 0)
  const activeOrders = orders.filter((order) => order.draw.isOpen && order.draw.drawDate >= now)

  const totalOrders = activeOrders.length
  const approvedOrders = activeOrders.filter((order) =>
    ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(order.status)
  ).length
  const pendingOrders = activeOrders.filter((order) =>
    ["PENDING_PAYMENT", "PENDING_APPROVAL"].includes(order.status)
  ).length

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-[#c9a84c]">MEMBER DASHBOARD</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              สวัสดี, {session.user.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">
              ตรวจสอบสถานะออเดอร์ของคุณ ว่าแอดมินอนุมัติแล้วหรือยัง และดูรูปหวยที่อัปโหลดแล้ว
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm font-medium text-white/50">ออเดอร์ปัจจุบัน</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{totalOrders}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm font-medium text-white/50">รอดำเนินการ</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-amber-400">{pendingOrders}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm font-medium text-white/50">อนุมัติแล้ว</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-emerald-400">{approvedOrders}</p>
          </div>
          <div className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-6">
            <p className="text-sm font-medium text-white/50">Wallet</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-[#c9a84c]">
              {walletBalance.toLocaleString("th-TH")}
            </p>
            <p className="mt-1 text-xs text-white/30">บาท</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-white">ออเดอร์ปัจจุบัน</h2>
            <Link href="/" className="text-sm font-semibold text-white/40 transition hover:text-white">
              ← หน้าแรก
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-base text-white/40">ยังไม่มีออเดอร์ปัจจุบันในระบบ</p>
              <Link href="/" className="mt-4 inline-flex rounded-xl bg-[#c9a84c] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#d4b860]">
                ซื้อหวยเลย
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>

        <Link
          href="/dashboard/history"
          className="flex items-center justify-between rounded-3xl border border-white/10 bg-[#0d0d0d] p-8 transition hover:border-[#c9a84c]/30 hover:bg-white/5"
        >
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">ประวัติย้อนหลัง</h2>
            <p className="mt-1 text-sm text-white/40">งวดที่ออกแล้ว / ปิดงวดแล้ว</p>
          </div>
          <span className="text-2xl text-white/20">→</span>
        </Link>
      </div>
    </div>
  )
}

function OrderCard({
  order,
}: {
  order: {
    id: string
    orderNumber: number
    status: string
    totalTHB: number | string | { toString(): string }
    createdAt: Date
    draw: {
      isOpen: boolean
      type: string
      drawDate: Date
      winningMain: string | null
      winningSpecial: string | null
    }
    items: {
      id: string
      mainNumbers: string
      specialNumber: string
      ticketPhotoUrl: string | null
    }[]
    payment: {
      status: string
    } | null
  }
}) {
  const resultSummary = getResultSummary(order)
  const uploadedTickets = order.items.filter((item) => item.ticketPhotoUrl)
  const isPB = order.draw.type === "POWERBALL"

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold tracking-[0.22em] text-white/30">
              ORDER #{String(order.orderNumber).padStart(4, "0")}
            </p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPB ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"}`}>
              {isPB ? "🔴 Power Ball" : "🔵 Mega Ball"}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-white/60 sm:grid-cols-2">
            <p>วันสั่งซื้อ: {formatThaiDate(order.createdAt)}</p>
            <p>งวดจะออก: {formatThaiDateTime(order.draw.drawDate)}</p>
            <p>ยอดรวม: <span className="text-[#c9a84c] font-semibold">{Math.round(Number(order.totalTHB.toString())).toLocaleString("th-TH")} บาท</span></p>
            <p>สถานะ: <span className="text-white">{getStatusLabel(order.status, order.payment?.status ?? null)}</span></p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold text-white/50">เลขที่ซื้อ</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.items.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-mono font-medium text-white/80"
                >
                  {item.mainNumbers} | {item.specialNumber}
                </span>
              ))}
            </div>
          </div>

          {uploadedTickets.length > 0 && (
            <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
              <p className="text-sm font-semibold text-[#c9a84c]">รูปหวยที่แอดมินอัปโหลด</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedTickets.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/api/order-items/${item.id}/ticket`}
                    target="_blank"
                    className="rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1 text-sm font-medium text-[#c9a84c] transition hover:bg-[#c9a84c]/20"
                  >
                    ดูรูปหวยชุดที่ {index + 1}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-2xl border p-4 ${resultSummary.tone}`}>
            <p className="text-sm font-semibold">ผลการตรวจรางวัล</p>
            <p className="mt-2 text-base font-semibold">{resultSummary.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-7 opacity-80">{resultSummary.detail}</p>
          </div>

          {order.status === "PENDING_PAYMENT" && order.draw.isOpen && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-semibold text-white/70">การชำระเงิน</p>
              <p className="mt-2 text-sm leading-7 text-white/50">
                ออเดอร์นี้ยังรอการชำระเงิน กรุณาโอนเงินและแนบสลิปก่อนหมดเวลา
              </p>
              <Link
                href={`/payment?orderId=${order.id}`}
                className="mt-4 inline-flex rounded-xl bg-[#c9a84c] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#d4b860]"
              >
                ไปชำระเงิน / แนบสลิป
              </Link>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            order.status === "REJECTED" || order.payment?.status === "REJECTED"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
              : order.status === "MATCHED" || order.status === "TICKET_UPLOADED"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/60"
          }`}>
            {getStatusLabel(order.status, order.payment?.status ?? null)}
          </div>
        </div>
      </div>
    </article>
  )
}
