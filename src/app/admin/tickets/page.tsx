import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketUploader } from "@/components/admin/TicketUploader"

export default async function TicketsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    include: {
      orders: {
        where: { status: { in: ["APPROVED", "TICKET_UPLOADED", "MATCHED"] } },
        include: {
          user: { select: { name: true } },
          items: true,
        },
      },
    },
    orderBy: { drawDate: "asc" },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <a href="/admin" className="text-white/60 hover:text-white">← Admin</a>
          <span className="text-white font-semibold">📷 อัปโหลดตั๋ว</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {draws.map((draw) => {
          const allItems = draw.orders.flatMap((o) =>
            o.items.map((item) => ({ ...item, customerName: o.user.name }))
          )
          const matched = allItems.filter((i) => i.matchedAt).length
          const total = allItems.length

          return (
            <Card key={draw.id} className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">
                  {draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"} —{" "}
                  งวด {new Date(draw.drawDate).toLocaleDateString("th-TH")}
                </CardTitle>
                <p className="text-white/50 text-sm">
                  จับคู่แล้ว {matched}/{total} ใบ
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unmatched items list */}
                <div>
                  <p className="text-white/60 text-sm mb-2">รายการที่ยังรอตั๋ว</p>
                  <div className="space-y-1">
                    {allItems.map((item, i) => (
                      <div key={item.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${item.matchedAt ? "bg-green-500/10" : "bg-white/5"}`}>
                        <span className="text-white/30 w-6">{i + 1}</span>
                        <span className="font-mono text-white/80 flex-1">{item.mainNumbers}</span>
                        <span className={`font-bold ${draw.type === "POWERBALL" ? "text-red-400" : "text-blue-400"}`}>
                          ● {item.specialNumber}
                        </span>
                        <span className="text-white/40 text-xs">{item.customerName}</span>
                        {item.matchedAt ? (
                          <span className="text-green-400 text-xs">✓ จับคู่แล้ว</span>
                        ) : (
                          <span className="text-yellow-400/60 text-xs">รอตั๋ว</span>
                        )}
                        {item.ticketPhotoUrl && (
                          <a href={item.ticketPhotoUrl} target="_blank" className="text-blue-400 text-xs hover:underline">ดูตั๋ว</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload */}
                <TicketUploader drawId={draw.id} />
              </CardContent>
            </Card>
          )
        })}

        {draws.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-10 text-center text-white/40">
              ไม่มีงวดที่เปิดอยู่
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
