import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CircleUserRound } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LotterySection } from "@/components/customer/LotterySection"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

function fmt(date: Date, opts: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", ...opts })
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "ADMIN") redirect("/admin")

  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) {
    await syncUpcomingDraws(prisma)
  }

  const draws = await prisma.draw.findMany({
    where: { isOpen: true },
    orderBy: { drawDate: "asc" },
  })

  const enriched = draws.map((draw) => ({
    id: draw.id,
    type: draw.type,
    drawDate: draw.drawDate.toISOString(),
    cutoffAt: draw.cutoffAt.toISOString(),
    jackpot: draw.jackpot,
    drawDateThai: fmt(draw.drawDate, { weekday: "long", day: "numeric", month: "long" }),
    drawTimeThai: fmt(draw.drawDate, { hour: "2-digit", minute: "2-digit" }),
    cutoffDateThai: fmt(draw.cutoffAt, { weekday: "short", day: "numeric", month: "short" }),
    cutoffTimeThai: fmt(draw.cutoffAt, { hour: "2-digit", minute: "2-digit" }),
  }))

  const openDraws = enriched.filter((draw) =>
    draw.type === "POWERBALL" || draw.type === "MEGA_MILLIONS"
  )
  const strongestJackpot = openDraws.map((draw) => draw.jackpot).find(Boolean) ?? "กำลังอัปเดต"
  const nextDraw = openDraws[0]
  const steps = [
    "เลือกเกมและเลขจากหน้าแรกได้ทันที",
    "สร้างรายการแล้วระบบจะพาไปหน้าชำระเงิน",
    "ข้อมูลบัญชีรับโอนจะแสดงเฉพาะหน้าชำระเงิน",
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              LU
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-emerald-600">
                บริการหวยอเมริกา
              </p>
              <p className="text-lg font-semibold tracking-tight text-slate-950">LottoUSA</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  แดชบอร์ด
                </Link>
                <div className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  <CircleUserRound className="mr-2 size-4 text-slate-500" />
                  <span className="hidden sm:inline">{session.user.name}</span>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">
              หน้าแรกสำหรับซื้อเลย
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              เลือกเลขและสร้างรายการได้ทันที
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              หน้าแรกนี้โฟกัสแค่สิ่งที่ลูกค้าต้องใช้จริง คือเลือกเกม เลือกเลข ใส่ตะกร้า และไปหน้าชำระเงิน
              ถ้ายังไม่ล็อกอินก็เลือกเลขเก็บไว้ก่อนได้ แล้วค่อยเข้าสู่ระบบตอนพร้อมชำระเงิน
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">เกมที่เปิดอยู่</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {openDraws.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">แจ็กพอตสูงสุด</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {strongestJackpot}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">งวดถัดไป</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                  {nextDraw ? nextDraw.drawDateThai : "รอประกาศตาราง"}
                </p>
                {nextDraw && <p className="mt-1 text-sm text-slate-500">{nextDraw.drawTimeThai} น.</p>}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#buy"
                className="inline-flex items-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                เริ่มเลือกเลข
              </a>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                {session ? "ไปที่แดชบอร์ด" : "เข้าสู่ระบบ"}
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-950">ลำดับการใช้งาน</p>
            <div className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">สิ่งที่ควรรู้ก่อนชำระเงิน</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                หน้านี้ยังไม่แสดงข้อมูลบัญชีรับโอน เพื่อให้หน้าแรกอ่านง่ายที่สุด เมื่อสร้างรายการแล้ว
                ระบบจะพาไปหน้าชำระเงินที่มีเลขที่บัญชี ยอดโอน และช่องแนบสลิปครบในหน้าเดียว
              </p>
            </div>
          </aside>
        </section>

        <section id="buy" className="pt-8">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">เลือกเลข</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              เลือกเกมและเลขที่ต้องการ
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              การ์ดแต่ละใบแยกตามเกมชัดเจน และตะกร้าจะรวมเลขที่คุณเลือกไว้ด้านล่างเพื่อให้ตรวจสอบก่อนสร้างรายการ
            </p>
          </div>
          <LotterySection draws={enriched} isLoggedIn={Boolean(session)} />
        </section>
      </main>
    </div>
  )
}
