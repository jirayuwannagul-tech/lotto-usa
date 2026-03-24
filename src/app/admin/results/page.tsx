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

function getDrawLabel(type: string) {
  return type === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
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
        const firstClosed = data.find((draw) => !draw.isOpen && !draw.winningMain)
        if (firstClosed) setSelectedId(firstClosed.id)
      })
  }, [])

  const selectedDraw = draws.find((draw) => draw.id === selectedId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return

    setError("")
    setResult(null)

    const nums = winMain.split(",").map((n) => n.trim()).filter(Boolean)
    if (nums.length !== 5) {
      setError("ต้องกรอกเลขหลัก 5 ตัว คั่นด้วย ,")
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
        const updated = await fetch("/api/draws?all=1").then((r) => r.json())
        setDraws(updated.slice(0, 20))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">RESULT MANAGEMENT</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">ประกาศผลรางวัล</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          เลือกงวดที่ปิดแล้ว กรอกเลขที่ออก แล้วให้ระบบคำนวณรายการที่ถูกรางวัลพร้อมส่งสรุปต่อให้ทีมงาน
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">กรอกเลขที่ออก</h3>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="text-sm text-slate-700">เลือกงวด</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950"
            >
              <option value="">-- เลือกงวด --</option>
              {draws.map((draw) => (
                <option key={draw.id} value={draw.id}>
                  {getDrawLabel(draw.type)} —{" "}
                  {new Date(draw.drawDate).toLocaleDateString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                  {draw.winningMain ? " • มีผลแล้ว" : draw.isOpen ? " • เปิดอยู่" : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedDraw?.winningMain && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              งวดนี้ประกาศผลแล้ว: <strong>{selectedDraw.winningMain}</strong> •{" "}
              <strong>{selectedDraw.winningSpecial}</strong>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-slate-700">เลขหลัก 5 ตัว (คั่นด้วย ,)</label>
              <input
                value={winMain}
                onChange={(e) => setWinMain(e.target.value)}
                placeholder="เช่น 5,11,22,36,52"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm text-slate-700">
                {selectedDraw?.type === "POWERBALL" ? "Powerball" : "Mega Ball"}
              </label>
              <input
                value={winSpecial}
                onChange={(e) => setWinSpecial(e.target.value)}
                placeholder="เช่น 10"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !selectedId}
            className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {loading ? "กำลังประมวลผล..." : "ประกาศผล"}
          </button>
        </form>
      </section>

      {result && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">
            ผลการตรวจ: ถูกรางวัล {result.winnerCount} รายการ
          </h3>
          {result.winnerMessages.length > 0 ? (
            <div className="mt-4 space-y-2">
              {result.winnerMessages.map((msg, index) => (
                <div key={index} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {msg}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">ไม่มีผู้ถูกรางวัลในงวดนี้</p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">งวดที่ประกาศผลแล้ว</h3>
        <div className="mt-5 space-y-3">
          {draws
            .filter((draw) => draw.winningMain)
            .map((draw) => (
              <article key={draw.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {getDrawLabel(draw.type)} —{" "}
                      {new Date(draw.drawDate).toLocaleDateString("th-TH", {
                        timeZone: "Asia/Bangkok",
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      เลข: <span className="font-mono">{draw.winningMain}</span> •{" "}
                      <span className="font-mono">{draw.winningSpecial}</span>
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    ประกาศแล้ว
                  </span>
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  )
}
