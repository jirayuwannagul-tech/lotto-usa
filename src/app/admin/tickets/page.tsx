import { prisma } from "@/lib/prisma"
import { TicketUploadForm } from "@/components/admin/TicketUploadForm"

export default async function AdminTicketsPage() {
  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
    select: { id: true, type: true, drawDate: true },
  })

  const readyOrders = await prisma.order.findMany({
    where: { status: { in: ["APPROVED", "TICKET_UPLOADED"] } },
    include: {
      user: true,
      items: true,
      draw: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })

  const manualOptions = readyOrders.flatMap((order) =>
    order.items
      .filter((item) => !item.matchedAt)
      .map((item) => ({
        drawId: order.draw.id,
        orderItemId: item.id,
        orderId: order.id,
        customerName: order.user.name,
        customerEmail: order.user.email,
        numbers: `${item.mainNumbers} | ${item.specialNumber}`,
      }))
  )

  const drawOptions = draws.map((draw) => ({
    id: draw.id,
    label: `${draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"} - ${draw.drawDate.toLocaleDateString("th-TH")}`,
  }))

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / TICKETS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">อัปโหลดรูปหวย</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          เลือกงวดที่ต้องการ แล้วอัปโหลดรูปหวยเพื่อให้ AI อ่านเลขก่อน จากนั้นให้แอดมินยืนยันรายการที่ถูกต้องอีกครั้ง
        </p>
      </div>

      <TicketUploadForm draws={drawOptions} manualOptions={manualOptions} />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">รายการที่พร้อมอัปโหลดรูป</h3>
        <div className="mt-4 grid gap-3">
          {readyOrders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{order.user.name}</p>
                  <p>
                    {order.draw.type === "POWERBALL" ? "Power Ball" : "Mega Ball"} / {order.status}
                  </p>
                </div>
                <p>{order.items.length} ชุดเลข</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
