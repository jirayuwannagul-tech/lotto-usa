"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface Order {
  id: string
  status: string
  totalUSD: string
  totalTHB: string
  rateUsed: string
  draw: { type: string; drawDate: string }
  items: { id: string; mainNumbers: string; specialNumber: string }[]
  payment: { id: string; status: string } | null
}

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
}

function formatDrawDate(date: string) {
  return new Date(date).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const uploadableStatuses = new Set(["PENDING_PAYMENT", "REJECTED"])

export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [copiedField, setCopiedField] = useState<"account" | "amount" | null>(null)

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(setOrder)
  }, [orderId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !order) return
    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("orderId", order.id)
    formData.append("slip", file)

    const res = await fetch("/api/payments", { method: "POST", body: formData })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "เกิดข้อผิดพลาด")
    } else {
      setDone(true)
    }
  }

  async function copyValue(value: string, field: "account" | "amount") {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500)
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">กำลังโหลดข้อมูลรายการ...</p>
      </div>
    )
  }

  const bankName = process.env.NEXT_PUBLIC_BANK_NAME ?? "ธนาคารกสิกรไทย"
  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "xxx-x-xxxxx-x"
  const bankHolder = process.env.NEXT_PUBLIC_BANK_HOLDER ?? "ชื่อบัญชี"
  const canUpload = uploadableStatuses.has(order.status)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
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

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        {done ? (
          <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
              ✓
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              ส่งสลิปเรียบร้อยแล้ว
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              รายการนี้จะอยู่ในสถานะรอตรวจสลิป เมื่อผู้ดูแลตรวจสอบเสร็จแล้ว คุณจะเห็นความคืบหน้าในแดชบอร์ด
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              กลับไปที่แดชบอร์ด
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-5">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ขั้นตอนที่ 1</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      ตรวจสอบรายการก่อนชำระเงิน
                    </h1>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      รายการนี้เป็น {getDrawLabel(order.draw.type)} งวด {formatDrawDate(order.draw.drawDate)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="mt-5 space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">ชุดที่ {index + 1}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.mainNumbers.split(",").map((n) => (
                          <span
                            key={n}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900"
                          >
                            {n}
                          </span>
                        ))}
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                          {item.specialNumber}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{order.items.length} ใบ</span>
                    <span>${Number(order.totalUSD).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-slate-600">
                    <span>อัตรา $1 = {Number(order.rateUsed).toFixed(2)} บาท</span>
                    <span>{Number(order.totalTHB).toFixed(0)} บาท</span>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-lg font-semibold text-slate-950">
                    ยอดที่ต้องโอน {Number(order.totalTHB).toFixed(0)} บาท
                  </div>
                </div>
              </article>

              {!canUpload && (
                <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">สถานะรายการ</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    รายการนี้ไม่ต้องส่งสลิปซ้ำแล้ว
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    ถ้าคุณส่งสลิปไปแล้วหรือผู้ดูแลกำลังดำเนินการอยู่ สามารถกลับไปดูความคืบหน้าได้จากแดชบอร์ด
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-5 inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                  >
                    กลับไปที่แดชบอร์ด
                  </Link>
                </article>
              )}
            </section>

            <aside className="space-y-5">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ขั้นตอนที่ 2</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">โอนเงินตามข้อมูลนี้</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">ธนาคาร</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">ชื่อบัญชี</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{bankHolder}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">เลขที่บัญชี</p>
                    <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-950">{bankAccount}</span>
                      <button
                        type="button"
                        onClick={() => copyValue(bankAccount, "account")}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        {copiedField === "account" ? "คัดลอกแล้ว" : "คัดลอก"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">จำนวนเงิน</p>
                    <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-base font-semibold text-slate-950">
                        {Number(order.totalTHB).toFixed(0)} บาท
                      </span>
                      <button
                        type="button"
                        onClick={() => copyValue(String(Number(order.totalTHB).toFixed(0)), "amount")}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                      >
                        {copiedField === "amount" ? "คัดลอกแล้ว" : "คัดลอก"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              {canUpload && (
                <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold tracking-[0.22em] text-emerald-600">ขั้นตอนที่ 3</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">แนบสลิปการโอน</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    หลังส่งสลิปแล้ว รายการนี้จะเข้าสู่คิวรอตรวจสอบโดยผู้ดูแลระบบ
                  </p>

                  <label className="mt-5 block cursor-pointer">
                    <div
                      className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                        file
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {file ? (
                        <>
                          <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                          <p className="mt-1 text-sm text-emerald-600">{(file.size / 1024).toFixed(0)} KB</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-950">แตะเพื่อเลือกรูปสลิป</p>
                          <p className="mt-1 text-sm text-slate-500">รองรับ JPG, PNG และ WEBP</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

                  <button
                    type="submit"
                    disabled={!file || loading}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {loading ? "กำลังส่งสลิป..." : "ส่งสลิป"}
                  </button>
                </form>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
