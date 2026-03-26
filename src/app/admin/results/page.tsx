"use client"

import { useEffect, useState } from "react"

interface Draw {
  id: string
  type: string
  drawDate: string
  isOpen: boolean
  winningMain?: string
  winningSpecial?: string
}

interface ResultResponse {
  winnerCount: number
  winnerMessages: string[]
}

export default function ResultsPage() {
  const [draws, setDraws] = useState<Draw[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [winMain, setWinMain] = useState("")
  const [winSpecial, setWinSpecial] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultResponse | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/draws?all=1")
      .then((r) => r.json())
      .then((data: Draw[]) => {
        setDraws(data.slice(0, 20))
        const firstClosed = data.find((d) => !d.isOpen && !d.winningMain)
        if (firstClosed) setSelectedId(firstClosed.id)
      })
  }, [])

  const selectedDraw = draws.find((d) => d.id === selectedId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    setError("")
    setResult(null)

    // Validate main numbers
    const nums = winMain.split(",").map((n) => n.trim()).filter(Boolean)
    const expectedCount = selectedDraw?.type === "POWERBALL" ? 5 : 5
    if (nums.length !== expectedCount) {
      setError(`ต้องกรอก ${expectedCount} เลขหลัก คั่นด้วย ,`)
      return
    }
    if (!winSpecial.trim()) {
      setError("กรอกเลขพิเศษด้วย")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/draws/${selectedId}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningMain: nums.join(","), winningSpecial: winSpecial.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด")
      } else {
        setResult(data)
        // Refresh draws list
        const updated = await fetch("/api/draws?all=1").then((r) => r.json())
        setDraws(updated.slice(0, 20))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      <header className="border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <a href="/admin" className="text-white/50 hover:text-white text-sm">← Admin</a>
          <span className="text-white font-semibold">ประกาศผลรางวัล</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Enter result */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">กรอกเลขที่ออก</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs block mb-1">เลือกงวด</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- เลือกงวด --</option>
                {draws.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"} —{" "}
                    {new Date(d.drawDate).toLocaleDateString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                    {d.winningMain ? " ✅ มีผลแล้ว" : d.isOpen ? " (เปิดอยู่)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedDraw?.winningMain && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-400">
                ✅ งวดนี้ประกาศผลแล้ว: <strong>{selectedDraw.winningMain}</strong> | <strong>{selectedDraw.winningSpecial}</strong>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs block mb-1">
                  เลขหลัก 5 ตัว (คั่นด้วย ,)
                </label>
                <input
                  value={winMain}
                  onChange={(e) => setWinMain(e.target.value)}
                  placeholder="เช่น 5,11,22,36,52"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm placeholder-white/30"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs block mb-1">
                  {selectedDraw?.type === "POWERBALL" ? "Powerball" : "Mega Ball"}
                </label>
                <input
                  value={winSpecial}
                  onChange={(e) => setWinSpecial(e.target.value)}
                  placeholder="เช่น 10"
                  className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm placeholder-white/30"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedId}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition disabled:opacity-40"
              style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)" }}
            >
              {loading ? "กำลังประมวลผล..." : "ประกาศผล + แจ้ง Telegram"}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3">
              ผลการตรวจ — ถูกรางวัล {result.winnerCount} รายการ
            </h3>
            {result.winnerMessages.length > 0 ? (
              <ul className="space-y-2">
                {result.winnerMessages.map((msg, i) => (
                  <li key={i} className="text-green-400 text-sm font-mono bg-green-500/5 rounded-lg px-3 py-2">
                    {msg}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/40 text-sm">ไม่มีผู้ถูกรางวัล</p>
            )}
            <p className="text-white/30 text-xs mt-3">✅ แจ้ง Telegram admin แล้ว</p>
          </div>
        )}

        {/* Recent draws with results */}
        <div>
          <h2 className="text-white/60 text-xs uppercase tracking-wider mb-3">งวดที่ประกาศผลแล้ว</h2>
          <div className="space-y-2">
            {draws
              .filter((d) => d.winningMain)
              .map((d) => (
                <div key={d.id} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {d.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"} —{" "}
                      {new Date(d.drawDate).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" })}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      เลข: <span className="font-mono text-white/70">{d.winningMain}</span> | <span className="font-mono text-white/70">{d.winningSpecial}</span>
                    </p>
                  </div>
                  <span className="text-green-400 text-xs">✅ ประกาศแล้ว</span>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  )
}
