import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
}

function formatThaiDateTime(date: Date) {
  return date.toLocaleString("th-TH", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }) + " น."
}

function getStatusLabel(status: string, paymentStatus: string | null) {
  if (status === "PENDING_PAYMENT") return "รอชำระเงิน"
  if (status === "PENDING_APPROVAL" || paymentStatus === "PENDING") return "รอตรวจสอบสลิป"
  if (status === "APPROVED") return "แอดมินอนุมัติแล้ว"
  if (status === "TICKET_UPLOADED") return "อัปโหลดรูปหวยแล้ว"
  if (status === "MATCHED") return "จับคู่ตั๋วแล้ว"
  if (status === "REJECTED" || paymentStatus === "REJECTED") return "รายการถูกปฏิเสธ"
  return status
}

function getPrizeLabel(type: string, matchMain: number, matchSpecial: boolean): string | null {
  const special = type === "POWERBALL" ? "Powerball" : "Mega Ball"
  if (matchMain === 5 && matchSpecial) return "🏆 แจ็คพอต!"
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

export default async function HistoryPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/admin")

  const now = new Date()

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      OR: [{ draw: { isOpen: false } }, { draw: { drawDate: { lt: now } } }],
    },
    include: { draw: true, items: true, payment: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-[#c9a84c]">MEMBER DASHBOARD</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">ประวัติย้อนหลัง</h1>
              <p className="mt-2 text-sm text-white/40">งวดที่ออกแล้ว / ปิดงวดแล้ว ทั้งหมด {orders.length} รายการ</p>
            </div>
            <Link href="/dashboard" className="text-sm font-semibold text-white/40 transition hover:text-white">
              ← กลับ Dashboard
            </Link>
          </div>
        </section>

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-base text-white/40">ยังไม่มีประวัติย้อนหลัง</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isPB = order.draw.type === "POWERBALL"
              const hasResult = order.draw.winningMain && order.draw.winningSpecial
              const winningMain = hasResult ? order.draw.winningMain!.split(",").map((n) => n.trim()).sort() : []
              const winningSpecial = hasResult ? order.draw.winningSpecial!.trim() : ""

              const winItems = order.items.map((item) => {
                const itemMain = item.mainNumbers.split(",").map((n) => n.trim()).sort()
                const matchMain = itemMain.filter((n) => winningMain.includes(n)).length
                const matchSpecial = item.specialNumber.trim() === winningSpecial
                const prize = hasResult ? getPrizeLabel(order.draw.type, matchMain, matchSpecial) : null
                return { item, prize, matchMain, matchSpecial }
              })

              const won = winItems.some((w) => w.prize)

              return (
                <article
                  key={order.id}
                  className={`rounded-3xl border p-6 bg-[#0d0d0d] ${won ? "border-[#c9a84c]/30" : "border-white/10"}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-semibold tracking-[0.22em] text-white/30">
                          ORDER #{String(order.orderNumber).padStart(4, "0")}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPB ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"}`}>
                          {isPB ? "🔴 Power Ball" : "🔵 Mega Ball"}
                        </span>
                        {won && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c]">
                            ถูกรางวัล 🏆
                          </span>
                        )}
                      </div>

                      <div className="grid gap-1 text-sm text-white/60 sm:grid-cols-2">
                        <p>วันสั่งซื้อ: {formatThaiDate(order.createdAt)}</p>
                        <p>งวดออกรางวัล: {formatThaiDateTime(order.draw.drawDate)}</p>
                        <p>ยอดรวม: <span className="text-[#c9a84c] font-semibold">{Number(order.totalTHB.toString()).toLocaleString("th-TH")} บาท</span></p>
                        <p>สถานะ: <span className="text-white">{getStatusLabel(order.status, order.payment?.status ?? null)}</span></p>
                      </div>

                      {hasResult ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-xs font-semibold text-white/40 mb-3">เลขที่ออกงวดนี้</p>
                          <div className="flex flex-wrap gap-1.5 items-center mb-4">
                            {winningMain.map((n, i) => (
                              <span
                                key={i}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isPB ? "bg-rose-600" : "bg-sky-600"}`}
                              >
                                {n}
                              </span>
                            ))}
                            <span className="text-white/20 mx-1">+</span>
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black bg-[#c9a84c]">
                              {winningSpecial}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {winItems.map(({ item, prize }) => (
                              <div
                                key={item.id}
                                className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${prize ? "bg-[#c9a84c]/10 text-[#c9a84c] font-semibold" : "bg-white/5 text-white/40"}`}
                              >
                                <span className="font-mono">{item.mainNumbers} | {item.specialNumber}</span>
                                <span>{prize ? `→ ${prize}` : "→ ไม่ถูกรางวัล"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <p className="text-sm text-amber-400">รอประกาศผลรางวัล</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {order.items.map((item) => (
                              <span
                                key={item.id}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-mono text-white/60"
                              >
                                {item.mainNumbers} | {item.specialNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
