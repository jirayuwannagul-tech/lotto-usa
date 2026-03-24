import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getExchangeRate } from "@/lib/exchange-rate"
import { redirect } from "next/navigation"
import Link from "next/link"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CutoffCountdown } from "@/components/shared/CutoffCountdown"
import LogoutButton from "@/components/shared/LogoutButton"

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

  const totalSpentTHB = myOrders.reduce((sum, o) => sum + Number(o.totalTHB), 0)
  const pendingCount = myOrders.filter((o) => o.status === "PENDING_PAYMENT").length
  const approvedCount = myOrders.filter((o) =>
    ["APPROVED", "TICKET_UPLOADED", "MATCHED"].includes(o.status)
  ).length

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0f1e]/80 backdrop-blur border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
              L
            </div>
            <span className="text-white font-bold tracking-tight">LottoUSA</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
              <span className="text-white/40 text-xs">$1 =</span>
              <span className="text-green-400 text-xs font-semibold">{rate.toFixed(2)} ฿</span>
            </div>
            <span className="text-white/50 text-sm hidden sm:block">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* Welcome + Stats */}
        <div>
          <h1 className="text-white text-xl font-bold mb-1">สวัสดี, {session.user.name} 👋</h1>
          <p className="text-white/40 text-sm mb-4">อัตราวันนี้: $1 = {rate.toFixed(2)} บาท</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "ออเดอร์ทั้งหมด", value: myOrders.length, color: "text-white" },
              { label: "รอชำระ", value: pendingCount, color: "text-yellow-400" },
              { label: "ซื้อแล้ว", value: approvedCount, color: "text-green-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-2xl p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-white/40 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Open Draws */}
        {openDraws.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider">งวดที่เปิดรับ</h2>
            {openDraws.map((draw) => {
              const isPowerball = draw.type === "POWERBALL"
              const pricePerTicket = 3.5
              return (
                <div
                  key={draw.id}
                  className={`relative rounded-2xl overflow-hidden border ${
                    isPowerball
                      ? "bg-gradient-to-br from-red-950/60 to-slate-900 border-red-800/30"
                      : "bg-gradient-to-br from-blue-950/60 to-slate-900 border-blue-800/30"
                  }`}
                >
                  {/* Glow effect */}
                  <div className={`absolute top-0 left-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${isPowerball ? "bg-red-500" : "bg-blue-500"}`} />

                  <div className="relative p-4 space-y-3">
                    {/* Type badge + countdown */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isPowerball
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {isPowerball ? "🔴 POWERBALL" : "🔵 MEGA MILLIONS"}
                        </span>
                      </div>
                      <CutoffCountdown
                        cutoffAt={draw.cutoffAt.toISOString()}
                        drawDate={draw.drawDate.toISOString()}
                        drawType={draw.type}
                        compact
                      />
                    </div>

                    {/* Jackpot */}
                    {draw.jackpot && (
                      <div>
                        <p className="text-white/40 text-xs">JACKPOT</p>
                        <p className="text-3xl font-black text-white tracking-tight">{draw.jackpot}</p>
                      </div>
                    )}

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-white/40 text-xs">ราคาต่อใบ</p>
                        <p className="text-white font-semibold">
                          ${pricePerTicket.toFixed(2)}{" "}
                          <span className="text-white/40 text-sm font-normal">≈ {(pricePerTicket * rate).toFixed(0)} ฿</span>
                        </p>
                      </div>
                      <Link href={`/orders/new?drawId=${draw.id}`}>
                        <button className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                          isPowerball
                            ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30"
                            : "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30"
                        }`}>
                          เลือกเลข →
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {openDraws.length === 0 && (
          <div className="rounded-2xl bg-white/3 border border-white/5 p-8 text-center">
            <p className="text-3xl mb-2">🎱</p>
            <p className="text-white/50">ยังไม่มีงวดที่เปิดรับ</p>
            <p className="text-white/30 text-sm mt-1">รอประกาศงวดถัดไป</p>
          </div>
        )}

        {/* Order History */}
        <div className="space-y-3">
          <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider">ประวัติออเดอร์</h2>

          {myOrders.length === 0 ? (
            <div className="rounded-2xl bg-white/3 border border-white/5 p-8 text-center">
              <p className="text-white/40">ยังไม่มีออเดอร์</p>
            </div>
          ) : (
            myOrders.map((order) => {
              const isPowerball = order.draw.type === "POWERBALL"
              return (
                <div key={order.id} className="rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white font-semibold text-sm">
                            {isPowerball ? "🔴 Powerball" : "🔵 Mega Millions"}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs">
                          งวด {new Date(order.draw.drawDate).toLocaleDateString("th-TH", {
                            day: "numeric", month: "short", year: "2-digit"
                          })}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Number balls */}
                    <div className="space-y-2 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-1.5 flex-wrap">
                          {item.mainNumbers.split(",").map((n) => (
                            <span key={n} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                              {n}
                            </span>
                          ))}
                          <span className="w-1 h-1 rounded-full bg-white/20 mx-1" />
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                            isPowerball
                              ? "bg-red-500/20 border-red-500/40 text-red-300"
                              : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                          }`}>
                            {item.specialNumber}
                          </span>
                          {item.matchedAt && (
                            <span className="text-green-400 text-xs ml-1">✓ ตั๋วแล้ว</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-xs">{order.items.length} ใบ</span>
                      <span className="text-white font-semibold">{Number(order.totalTHB).toFixed(0)} ฿</span>
                    </div>

                    {/* Pay button */}
                    {order.status === "PENDING_PAYMENT" && (
                      <Link href={`/orders/${order.id}/pay`}>
                        <button className="mt-3 w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-all active:scale-95">
                          💳 ชำระเงิน
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {totalSpentTHB > 0 && (
          <div className="text-center text-white/20 text-xs pb-4">
            ยอดรวมทั้งหมดที่ซื้อ: {totalSpentTHB.toFixed(0)} ฿
          </div>
        )}
      </main>
    </div>
  )
}
