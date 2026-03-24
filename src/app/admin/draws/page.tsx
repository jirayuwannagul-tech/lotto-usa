"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        const { drawDate, cutoffAt } = getNextDrawFormValues(value as "POWERBALL" | "MEGA_MILLIONS")
        setForm((f) => ({ ...f, type: value, drawDate, cutoffAt }))
      } else {
        setForm((f) => ({ ...f, [field]: value }))
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
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300/75">DRAW CONTROL</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">จัดการงวดหวย</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          เพิ่มงวดใหม่ ปรับเวลาปิดรับ และตรวจสถานะการเปิดขายของแต่ละเกมจากหน้าจัดการนี้
        </p>
      </section>

        {/* Create draw */}
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white text-base">+ เพิ่มงวดใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createDraw} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">ประเภท</Label>
                  <select value={form.type} onChange={update("type")} className="w-full bg-white/10 border border-white/20 text-white rounded-md px-3 py-2 text-sm mt-1">
                    <option value="POWERBALL">🔴 Powerball</option>
                    <option value="MEGA_MILLIONS">🔵 Mega Millions</option>
                  </select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Jackpot (เช่น $450M)</Label>
                  <Input value={form.jackpot} onChange={update("jackpot")} placeholder="$450,000,000" className="bg-white/10 border-white/20 text-white mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">วันออกรางวัล (UTC)</Label>
                  <Input type="datetime-local" value={form.drawDate} onChange={update("drawDate")} className="bg-white/10 border-white/20 text-white mt-1" required />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">ปิดรับออเดอร์ (7AM LA = 14:00 UTC)</Label>
                  <Input type="datetime-local" value={form.cutoffAt} onChange={update("cutoffAt")} className="bg-white/10 border-white/20 text-white mt-1" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white">
                {loading ? "กำลังสร้าง..." : "สร้างงวด"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Draw list */}
        <div className="space-y-3">
          {draws.map((d) => (
            <Card key={d.id} className="border-slate-800 bg-slate-950/70">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">
                    {d.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"}
                    {d.jackpot && <span className="text-yellow-400 ml-2 text-sm">{d.jackpot}</span>}
                  </p>
                  <p className="text-white/50 text-xs">
                    ออกรางวัล: {new Date(d.drawDate).toLocaleString("th-TH")}
                  </p>
                  <p className="text-white/50 text-xs">
                    ปิดรับ: {new Date(d.cutoffAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${d.isOpen ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {d.isOpen ? "เปิด" : "ปิด"}
                  </span>
                  {d.isOpen && (
                    <Button size="sm" variant="ghost" onClick={() => closeDraw(d.id)} className="text-red-400 hover:text-red-300 text-xs border border-red-500/30">
                      ปิดงวด
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  )
}
