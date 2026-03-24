"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { NumberPicker } from "@/components/customer/NumberPicker"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

interface NumberSet {
  mainNumbers: string[]
  specialNumber: string
}

interface Draw {
  id: string
  type: string
  drawDate: string
  cutoffAt: string
  jackpot?: string
}

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
}

function NewOrderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const drawId = searchParams.get("drawId")

  const [draw, setDraw] = useState<Draw | null>(null)
  const [rate, setRate] = useState(35)
  const [sets, setSets] = useState<NumberSet[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (drawId) {
      fetch(`/api/draws/${drawId}`).then((r) => r.json()).then(setDraw)
      fetch("/api/exchange-rate").then((r) => r.json()).then((data) => setRate(data.rate))
    }
  }, [drawId])

  function handleConfirm(confirmedSets: NumberSet[]) {
    setSets(confirmedSets)
  }

  async function handleSubmitOrder() {
    if (!sets || !drawId) return

    setLoading(true)
    setError("")

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawId, items: sets }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด")
      setSets(null)
      return
    }

    router.push(`/orders/${data.id}/pay`)
  }

  if (!draw) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">กำลังโหลดงวดที่เลือก...</p>
      </div>
    )
  }

  const rule = LOTTERY_RULES[draw.type as DrawType]
  const pricePerTicket = rule.priceUSD + 1.5

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            ← กลับ
          </button>
          <Link href="/dashboard" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
            ไปที่แดชบอร์ด
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {!sets ? (
              <>
                <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ขั้นตอนที่ 1</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  เลือกเลขสำหรับรายการนี้
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  คุณสามารถเพิ่มหลายชุดในหน้าเดียวได้ เมื่อเลือกครบแล้วค่อยตรวจสอบรายการก่อนสร้างออเดอร์
                </p>

                <div className="mt-6">
                  <NumberPicker drawType={draw.type as DrawType} onConfirm={handleConfirm} />
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ขั้นตอนที่ 2</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  ตรวจสอบรายการก่อนสร้างออเดอร์
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  หน้าถัดไปจะเป็นหน้าชำระเงิน ซึ่งจะแสดงเลขที่บัญชีรับโอน ยอดที่ต้องโอน และช่องแนบสลิปให้ครบในหน้าเดียว
                </p>

                <div className="mt-6 space-y-3">
                  {sets.map((set, index) => (
                    <div key={`${set.mainNumbers.join("-")}-${set.specialNumber}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">ชุดที่ {index + 1}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {set.mainNumbers.map((n) => (
                          <span
                            key={n}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900"
                          >
                            {n}
                          </span>
                        ))}
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                          {set.specialNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{sets.length} ใบ × ${pricePerTicket.toFixed(2)}</span>
                    <span>${(sets.length * pricePerTicket).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-slate-600">
                    <span>อัตรา $1 = {rate.toFixed(2)} บาท</span>
                    <span>{(sets.length * pricePerTicket * rate).toFixed(0)} บาท</span>
                  </div>
                </div>

                {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSets(null)}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                  >
                    กลับไปแก้เลข
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {loading ? "กำลังสร้างออเดอร์..." : "สร้างออเดอร์และไปหน้าชำระเงิน"}
                  </button>
                </div>
              </>
            )}
          </section>

          <aside className="space-y-5">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">งวดที่เลือก</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {getDrawLabel(draw.type)}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                ออกรางวัล {new Date(draw.drawDate).toLocaleDateString("th-TH", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                ปิดรับ {new Date(draw.cutoffAt).toLocaleString("th-TH")}
              </p>
              {draw.jackpot && (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">แจ็กพอต</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {draw.jackpot}
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">ค่าใช้จ่ายโดยประมาณ</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>ราคาต่อใบ</span>
                  <span className="font-semibold text-slate-950">${pricePerTicket.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>อัตราแลกเปลี่ยน</span>
                  <span className="font-semibold text-slate-950">$1 = {rate.toFixed(2)} บาท</span>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                ข้อมูลบัญชีรับโอนจะยังไม่แสดงในหน้านี้ เพื่อให้หน้าเลือกเลขอ่านง่ายที่สุด เมื่อกดสร้างออเดอร์แล้ว
                ระบบจะพาไปหน้าชำระเงินที่มีข้อมูลโอนครบ
              </div>
            </article>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">กำลังโหลด...</p>
        </div>
      }
    >
      <NewOrderContent />
    </Suspense>
  )
}
