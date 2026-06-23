"use client"

import { useEffect, useState } from "react"

interface HistoricalDraw {
  id: string
  type: string
  drawDate: string
  winningMain: string
  winningSpecial: string
}

const DRAW_TYPES = [
  { value: "POWERBALL", label: "Powerball (จ, พฤ, เสาร์)" },
  { value: "MEGA_MILLIONS", label: "Mega Millions (อ, ศ)" },
]

function DrawRow({ draw }: { draw: HistoricalDraw }) {
  const date = new Date(draw.drawDate).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  })
  const typeLabel = draw.type === "POWERBALL" ? "🔴 PB" : "🔵 MM"
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4 text-sm font-medium text-slate-500">{typeLabel}</td>
      <td className="py-2 pr-4 text-sm text-slate-700">{date}</td>
      <td className="py-2 pr-4 font-mono text-sm text-slate-900">{draw.winningMain}</td>
      <td className="py-2 font-mono text-sm font-semibold text-slate-900">
        <span className={draw.type === "POWERBALL" ? "text-rose-600" : "text-sky-600"}>
          {draw.winningSpecial}
        </span>
      </td>
    </tr>
  )
}

export default function HistoryPage() {
  const [type, setType] = useState("POWERBALL")
  const [drawDate, setDrawDate] = useState("")
  const [winningMain, setWinningMain] = useState("")
  const [winningSpecial, setWinningSpecial] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [draws, setDraws] = useState<HistoricalDraw[]>([])
  const [loadingDraws, setLoadingDraws] = useState(true)

  function loadDraws() {
    setLoadingDraws(true)
    fetch("/api/admin/historical-draw")
      .then((r) => r.json())
      .then((data: HistoricalDraw[]) => setDraws(data))
      .catch(() => setDraws([]))
      .finally(() => setLoadingDraws(false))
  }

  useEffect(() => { loadDraws() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const res = await fetch("/api/admin/historical-draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, drawDate, winningMain, winningSpecial }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด")
      } else {
        setSuccess(`บันทึกผลรางวัลวันที่ ${drawDate} สำเร็จ`)
        setWinningMain("")
        setWinningSpecial("")
        setDrawDate("")
        loadDraws()
      }
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้")
    } finally {
      setSaving(false)
    }
  }

  const pbDraws = draws.filter((d) => d.type === "POWERBALL")
  const mmDraws = draws.filter((d) => d.type === "MEGA_MILLIONS")

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">อัปโหลดผลรางวัลย้อนหลัง</h2>
        <p className="mt-1 text-sm text-slate-500">
          กรอกผลรางวัลที่ผ่านมาเพื่อให้ระบบสถิติ AI เลือกเลขมีข้อมูลมากขึ้น
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
      >
        <h3 className="font-semibold text-slate-800">เพิ่มผลรางวัลงวด</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              ประเภทลอตเตอรี
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {DRAW_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              วันออกรางวัล
            </label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              เลขหลัก 5 ตัว{" "}
              <span className="font-normal text-slate-400">
                (คั่นด้วยจุลภาค เช่น 5,12,33,45,67)
              </span>
            </label>
            <input
              type="text"
              value={winningMain}
              onChange={(e) => setWinningMain(e.target.value)}
              placeholder="5,12,33,45,67"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              {type === "POWERBALL" ? "1-69 จำนวน 5 ตัว" : "1-70 จำนวน 5 ตัว"}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {type === "POWERBALL" ? "Powerball" : "Mega Ball"}
            </label>
            <input
              type="number"
              value={winningSpecial}
              onChange={(e) => setWinningSpecial(e.target.value)}
              placeholder={type === "POWERBALL" ? "1-26" : "1-25"}
              min={1}
              max={type === "POWERBALL" ? 26 : 25}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก…" : "บันทึกผลรางวัล"}
        </button>
      </form>

      {/* Existing data */}
      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { label: "🔴 Powerball", rows: pbDraws },
          { label: "🔵 Mega Millions", rows: mmDraws },
        ].map(({ label, rows }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-800">{label}</h3>
            {loadingDraws ? (
              <p className="text-sm text-slate-400">กำลังโหลด…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีข้อมูลย้อนหลัง</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">ประเภท</th>
                      <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">วันที่</th>
                      <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">เลขหลัก</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">พิเศษ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => <DrawRow key={d.id} draw={d} />)}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{rows.length} งวดในระบบ</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>ข้อมูลจากเว็บทางการ:</strong>{" "}
        <a
          href="https://www.powerball.com/previous-results"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Powerball ผลย้อนหลัง
        </a>
        {" · "}
        <a
          href="https://www.megamillions.com/winning-numbers/previous-drawings"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Mega Millions ผลย้อนหลัง
        </a>
      </div>
    </div>
  )
}
