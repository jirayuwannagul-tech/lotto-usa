"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getNextDrawFormValues } from "@/lib/draw-schedule"

interface Draw {
  id: string
  type: string
  drawDate: string
  cutoffAt: string
  isOpen: boolean
  jackpot?: string
}

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([])
  const [form, setForm] = useState(() => {
    const { drawDate, cutoffAt } = getNextDrawFormValues("POWERBALL")
    return { type: "POWERBALL", drawDate, cutoffAt, jackpot: "" }
  })
  const [loading, setLoading] = useState(false)

  async function fetchDraws() {
    const res = await fetch("/api/draws?all=1")
    setDraws(await res.json())
  }

  useEffect(() => {
    let cancelled = false
    fetch("/api/draws?all=1")
      .then((res) => res.json())
      .then((data: Draw[]) => {
        if (!cancelled) setDraws(data)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value
      if (field === "type") {
        const values = getNextDrawFormValues(value as "POWERBALL" | "MEGA_MILLIONS")
        setForm((current) => ({ ...current, type: value, drawDate: values.drawDate, cutoffAt: values.cutoffAt }))
      } else {
        setForm((current) => ({ ...current, [field]: value }))
      }
    }
  }

  async function createDraw(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/draws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)

    const { drawDate, cutoffAt } = getNextDrawFormValues("POWERBALL")
    setForm({ type: "POWERBALL", drawDate, cutoffAt, jackpot: "" })
    fetchDraws()
  }

  async function closeDraw(id: string) {
    await fetch(`/api/draws/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: false }),
    })
    fetchDraws()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">DRAW CONTROL</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">จัดการงวดหวย</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          เพิ่มงวดใหม่ ปรับเวลาปิดรับ และปิดงวดที่ไม่เปิดขายแล้วจากหน้าหลังบ้านนี้
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">เพิ่มงวดใหม่</h3>
        <form onSubmit={createDraw} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-slate-700">ประเภท</Label>
              <select
                value={form.type}
                onChange={update("type")}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950"
              >
                <option value="POWERBALL">พาวเวอร์บอล</option>
                <option value="MEGA_MILLIONS">เมกา มิลเลียนส์</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-700">Jackpot</Label>
              <Input
                value={form.jackpot}
                onChange={update("jackpot")}
                placeholder="$450,000,000"
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-slate-700">วันออกรางวัล (UTC)</Label>
              <Input
                type="datetime-local"
                value={form.drawDate}
                onChange={update("drawDate")}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                required
              />
            </div>
            <div>
              <Label className="text-slate-700">ปิดรับออเดอร์ (UTC)</Label>
              <Input
                type="datetime-local"
                value={form.cutoffAt}
                onChange={update("cutoffAt")}
                className="mt-2 h-11 rounded-xl border-slate-200 bg-white"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
            {loading ? "กำลังสร้าง..." : "สร้างงวด"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">งวดทั้งหมด</h3>
        <div className="mt-5 space-y-3">
          {draws.map((draw) => (
            <article key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {draw.type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"}
                    {draw.jackpot && <span className="ml-2 text-slate-500">{draw.jackpot}</span>}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    ออกรางวัล {new Date(draw.drawDate).toLocaleString("th-TH")}
                  </p>
                  <p className="text-sm text-slate-500">
                    ปิดรับ {new Date(draw.cutoffAt).toLocaleString("th-TH")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      draw.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {draw.isOpen ? "เปิดขาย" : "ปิดงวดแล้ว"}
                  </span>
                  {draw.isOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => closeDraw(draw.id)}
                      className="border border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                    >
                      ปิดงวด
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
