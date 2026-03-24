import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketUploader } from "@/components/admin/TicketUploader"

export default async function TicketsPage() {
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
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300/75">TICKET MATCHING</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">อัปโหลดตั๋วและจับคู่เลข</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          ใช้หน้านี้สำหรับอัปโหลดรูปตั๋วที่ซื้อจริง เพื่อให้ระบบ OCR อ่านเลขและจับคู่กับรายการที่อนุมัติแล้วโดยอัตโนมัติ
        </p>
      </section>

        {draws.map((draw) => {
          const allItems = draw.orders.flatMap((o) =>
            o.items.map((item) => ({ ...item, customerName: o.user.name }))
          )
          const matched = allItems.filter((i) => i.matchedAt).length
          const total = allItems.length

          return (
            <Card key={draw.id} className="border-slate-800 bg-slate-950/70">
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
                          <a
                            href={`/api/order-items/${item.id}/ticket`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 text-xs hover:underline"
                          >
                            ดูตั๋ว
                          </a>
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
          <Card className="border-slate-800 bg-slate-950/70">
            <CardContent className="py-10 text-center text-white/40">
              ไม่มีงวดที่เปิดอยู่
            </CardContent>
          </Card>
        )}
    </div>
  )
}
