import { prisma } from "@/lib/prisma"
import { TicketUploader } from "@/components/admin/TicketUploader"

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
}

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
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">TICKET MATCHING</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">อัปโหลดตั๋วและจับคู่เลข</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          ใช้หน้านี้สำหรับอัปโหลดรูปตั๋วจริงที่ซื้อมา ระบบจะอ่านเลขจากภาพแล้วจับคู่กับรายการที่อนุมัติไว้
        </p>
      </section>

      {draws.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">ไม่มีงวดที่เปิดอยู่ในตอนนี้</p>
        </section>
      ) : (
        draws.map((draw) => {
          const allItems = draw.orders.flatMap((order) =>
            order.items.map((item) => ({ ...item, customerName: order.user.name }))
          )
          const matched = allItems.filter((item) => item.matchedAt).length
          const total = allItems.length

          return (
            <section key={draw.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {getDrawLabel(draw.type)}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    งวด{" "}
                    {new Date(draw.drawDate).toLocaleDateString("th-TH", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  จับคู่แล้ว {matched}/{total} ใบ
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">รายการที่รอตั๋วหรือจับคู่แล้ว</p>
                <div className="mt-4 space-y-2">
                  {allItems.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-white bg-white p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">รายการ {index + 1}</p>
                          <p className="mt-1 font-mono text-sm text-slate-700">
                            {item.mainNumbers} • {item.specialNumber}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              item.matchedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.matchedAt ? "จับคู่แล้ว" : "รอตั๋ว"}
                          </span>
                          {item.ticketPhotoUrl && (
                            <a
                              href={`/api/order-items/${item.id}/ticket`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-sky-700 hover:underline"
                            >
                              ดูตั๋ว
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <TicketUploader drawId={draw.id} />
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
