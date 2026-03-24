import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, CircleUserRound } from "lucide-react"
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

  const prizeHighlights = [
    {
      title: "รางวัลเลข 2 ตัวตรง",
      description: "เลขทั้ง 2 หลักต้องตรงตามผลประกาศและเรียงลำดับตรงกัน ระบบจะแสดงผลตรวจหลังมีการอัปเดตผลรางวัล",
      details: [
        "หมายเลขที่ซื้อจะต้องตรงครบทั้ง 2 หลักตามลำดับเดียวกับผลที่ประกาศ",
        "ระบบจะอ้างอิงเลขที่บันทึกในออเดอร์และผลรางวัลที่ผู้ดูแลระบบประกาศในแต่ละงวด",
        "เมื่อถูกรางวัล คุณจะเห็นสถานะและผลตรวจได้จากแดชบอร์ดของบัญชีตนเอง",
      ],
    },
    {
      title: "รางวัลเลข 2 ตัวสลับ",
      description: "กรณีตัวเลขทั้ง 2 หลักตรงกันแต่สลับตำแหน่ง เช่น 12 และ 21 ระบบจะแยกผลให้เห็นชัดเจนว่าเป็นรางวัลตัวสลับ",
      details: [
        "ใช้กับกรณีที่ตัวเลขตรงกันทั้ง 2 หลัก แต่ลำดับกลับกันจากผลประกาศ",
        "ระบบจะแยกผลรางวัลตัวสลับออกจากรางวัลตัวตรง เพื่อลดความสับสนในการตรวจผล",
        "หากมีเงื่อนไขเพิ่มเติมในงวดนั้น ระบบจะแสดงผลตามข้อมูลที่ประกาศไว้ในรายการของคุณ",
      ],
    },
    {
      title: "ตรวจสอบรางวัลย้อนหลัง",
      description: "หลังประกาศผล คุณสามารถย้อนกลับมาดูเลขที่ซื้อ ผลการตรวจ และสถานะรางวัลได้จากแดชบอร์ดตลอดเวลา",
      details: [
        "ดูรายการซื้อย้อนหลังได้จากบัญชีเดียวกัน โดยระบบจะเก็บเลขที่ซื้อและวันเวลาของแต่ละรายการ",
        "เมื่อผู้ดูแลระบบอัปเดตผลแล้ว ระบบจะแสดงผลจับคู่ของแต่ละรายการให้ตรวจสอบได้ทันที",
        "หากรายการมีสถานะเปลี่ยนแปลง คุณสามารถกลับมาตรวจสอบซ้ำได้โดยไม่ต้องส่งข้อมูลใหม่",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              LU
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.22em] text-emerald-600">
                บริการหวยอเมริกา
              </p>
              <p className="text-lg font-semibold tracking-tight text-slate-950">LottoUSA</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm font-medium text-slate-500 md:flex">
            <a href="#buy" className="transition hover:text-slate-950">
              เกม
            </a>
            <a href="#prizes" className="transition hover:text-slate-950">
              รางวัลทั้งหมดหวย 2 ตัว
            </a>
            <a href="/admin" className="text-slate-400 transition hover:text-slate-700">
              ผู้ดูแล
            </a>
          </div>

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
                <a
                  href="#buy"
                  className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  เข้าสู่ระบบ
                </a>
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

      <main>
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">
                เลือกเกม เลือกเลข ชำระเงิน
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                ซื้อหวยอเมริกาได้ง่ายขึ้นในหน้าเดียว
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                หน้าแรกนี้ออกแบบให้คนไทยใช้งานง่าย เห็นงวดที่เปิดขาย เวลาออกรางวัล
                การเลือกเลข และตะกร้าอย่างชัดเจนในจอเดียว
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#buy"
                  className="inline-flex items-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  เลือกเกม
                  <ArrowRight className="ml-2 size-4" />
                </a>
                <a
                  href="#prizes"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  ดูรางวัลทั้งหมดหวย 2 ตัว
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                    เกมที่เปิดอยู่
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {openDraws.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                    แจ็กพอตสูงสุด
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {strongestJackpot}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                    งวดถัดไป
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    {nextDraw ? nextDraw.drawDateThai : "รอประกาศตาราง"}
                  </p>
                  {nextDraw && (
                    <p className="mt-1 text-sm text-slate-500">{nextDraw.drawTimeThai} น.</p>
                  )}
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-950">เปิดขายตอนนี้</p>

              <div className="mt-4 space-y-3">
                {openDraws.length > 0 ? (
                  openDraws.map((draw) => (
                    <div key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {draw.type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {draw.drawDateThai} เวลา {draw.drawTimeThai} น.
                          </p>
                        </div>
                        <p className="text-lg font-semibold tracking-tight text-slate-950">
                          {draw.jackpot ?? "กำลังอัปเดต"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    ตอนนี้ยังไม่มีงวดที่เปิดขาย
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">รางวัลเด่น</p>
                <div className="mt-4 space-y-3">
                  {prizeHighlights.map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="buy" className="mx-auto max-w-6xl px-5 pb-12 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              เกม
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              เลือกเลขของคุณ
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              การ์ดแต่ละใบจะแสดงแจ็กพอต วันเวลาออกรางวัล และปุ่มเริ่มเลือกเลขแบบชัดเจน
            </p>
          </div>
          <LotterySection draws={enriched} isLoggedIn={Boolean(session)} />
        </section>

        <section id="prizes" className="mx-auto max-w-6xl px-5 pb-16 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              รางวัลทั้งหมดหวย 2 ตัว
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              สรุปรางวัลและการตรวจสอบผลในหน้าเดียว
            </h3>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {prizeHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                  <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-600">
                    รางวัล
                  </div>
                  <h4 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                  <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                    {item.details.map((detail) => (
                      <div key={detail} className="flex gap-2">
                        <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                        <p className="text-sm leading-6 text-slate-600">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">หมายเหตุการตรวจผล</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                หน้านี้สรุปประเภทรางวัลและวิธีตรวจผลให้เข้าใจง่าย ส่วนมูลค่ารางวัลหรือเงื่อนไขเฉพาะของแต่ละงวด
                ให้ยึดตามข้อมูลที่ระบบประกาศในงวดนั้นและผลตรวจที่แสดงในแดชบอร์ดของคุณ
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
