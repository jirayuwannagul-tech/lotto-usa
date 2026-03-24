"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [form, setForm] = useState({ type: "POWERBALL", drawDate: "", cutoffAt: "", jackpot: "" })
  const [loading, setLoading] = useState(false)

  async function fetchDraws() {
    const res = await fetch("/api/draws")
    setDraws(await res.json())
  }

  useEffect(() => { fetchDraws() }, [])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
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
    setForm({ type: "POWERBALL", drawDate: "", cutoffAt: "", jackpot: "" })
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <a href="/admin" className="text-white/60 hover:text-white">← Admin</a>
          <span className="text-white font-semibold">จัดการงวดหวย</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Create draw */}
        <Card className="bg-white/5 border-white/10">
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
            <Card key={d.id} className="bg-white/5 border-white/10">
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
      </main>
    </div>
  )
}
