"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface NumberStat {
  number: string
  count: number
  pct: number
}

interface StatsData {
  totalDraws: number
  mainStats: NumberStat[]
  specialStats: NumberStat[]
  latestDrawDate: string | null
}

type DrawType = "POWERBALL" | "MEGA_MILLIONS"

function heatColor(pct: number, maxPct: number): string {
  if (maxPct === 0) return "bg-white/5 text-white/30 border-white/10"
  const ratio = pct / maxPct
  if (ratio >= 0.8) return "bg-rose-500 text-white border-rose-500"
  if (ratio >= 0.6) return "bg-orange-400 text-white border-orange-400"
  if (ratio >= 0.4) return "bg-amber-400 text-black border-amber-400"
  if (ratio >= 0.2) return "bg-sky-500/60 text-white border-sky-500/60"
  return "bg-indigo-900/60 text-white/60 border-indigo-800/60"
}

function NumberHeatGrid({
  stats,
  specialColor,
  label,
}: {
  stats: NumberStat[]
  specialColor: string
  label: string
}) {
  const maxPct = Math.max(...stats.map((s) => s.pct), 0)

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-white/60 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {stats.map((s) => (
          <div
            key={s.number}
            className={`relative flex h-11 w-11 flex-col items-center justify-center rounded-xl border text-[10px] font-semibold transition ${specialColor || heatColor(s.pct, maxPct)}`}
            title={`${s.number}: ออก ${s.count} ครั้ง (${s.pct}%)`}
          >
            <span className="text-[13px] font-bold leading-none">{s.number}</span>
            <span className="mt-0.5 opacity-80">{s.pct > 0 ? `${s.pct}%` : "-"}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-rose-500" /> ร้อน ≥80%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" /> ปานกลาง
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-indigo-900/60" /> เย็น
        </span>
      </div>
    </div>
  )
}

function TopList({ stats, title, order }: { stats: NumberStat[]; title: string; order: "asc" | "desc" }) {
  const sorted = [...stats]
    .filter((s) => s.count > 0)
    .sort((a, b) => (order === "desc" ? b.count - a.count : a.count - b.count))
    .slice(0, 10)

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">{title}</p>
      <div className="space-y-1.5">
        {sorted.length === 0 ? (
          <p className="text-sm text-white/30">ยังไม่มีข้อมูล</p>
        ) : (
          sorted.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-white/30">{i + 1}.</span>
              <span className="w-8 rounded-lg border border-white/10 bg-white/5 py-0.5 text-center font-mono text-sm font-semibold text-white">
                {s.number}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-2 rounded-full ${order === "desc" ? "bg-rose-500" : "bg-indigo-500"}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
              <span className="w-14 text-right text-xs text-white/50">
                {s.count}ครั้ง / {s.pct}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const [drawType, setDrawType] = useState<DrawType>("POWERBALL")
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    setError("")
    fetch(`/api/stats?type=${drawType}`)
      .then((r) => r.json())
      .then((d: StatsData) => setData(d))
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false))
  }, [drawType])

  const latestDate = data?.latestDrawDate
    ? new Date(data.latestDrawDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Los_Angeles",
      })
    : null

  return (
    <div className="min-h-screen bg-[#0a0a12] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <Link href="/" className="mb-4 inline-block text-sm text-white/40 hover:text-white/70">
            ← กลับหน้าหลัก
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">สถิติเลขร้อน–เย็น</h1>
          <p className="mt-1 text-sm text-white/50">
            วิเคราะห์ความถี่การออกรางวัลของแต่ละเลข คิดเป็น % จากผลย้อนหลัง
          </p>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2">
          {(["POWERBALL", "MEGA_MILLIONS"] as DrawType[]).map((t) => (
            <button
              key={t}
              onClick={() => setDrawType(t)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                drawType === t
                  ? t === "POWERBALL"
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-sky-500 bg-sky-500 text-white"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
              }`}
            >
              {t === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-20 text-center text-sm text-white/40">กำลังโหลดสถิติ…</div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-sm text-white/50">
              <span>
                ข้อมูลจาก{" "}
                <strong className="text-white">{data.totalDraws} งวด</strong>
              </span>
              {latestDate && (
                <span>
                  ล่าสุด:{" "}
                  <strong className="text-white">{latestDate}</strong>
                </span>
              )}
            </div>

            {data.totalDraws === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
                <p className="text-white/50">ยังไม่มีข้อมูลผลรางวัลในระบบ</p>
                <p className="mt-2 text-sm text-white/30">
                  ผู้ดูแลระบบต้องกรอกผลรางวัลย้อนหลังก่อน
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Main numbers heat grid */}
                <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                  <NumberHeatGrid
                    stats={data.mainStats}
                    specialColor=""
                    label={`เลขหลัก (1-${data.mainStats.length})`}
                  />
                </div>

                {/* Special number heat grid */}
                <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                  <NumberHeatGrid
                    stats={data.specialStats}
                    specialColor=""
                    label={
                      drawType === "POWERBALL"
                        ? `Powerball (1-${data.specialStats.length})`
                        : `Mega Ball (1-${data.specialStats.length})`
                    }
                  />
                </div>

                {/* Top 10 hot / cold */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <TopList stats={data.mainStats} title="🔥 เลขหลักร้อน (ออกบ่อย)" order="desc" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <TopList stats={data.mainStats} title="🧊 เลขหลักเย็น (ออกน้อย)" order="asc" />
                  </div>
                </div>

                {/* Hot/cold special */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <TopList
                      stats={data.specialStats}
                      title={`🔥 ${drawType === "POWERBALL" ? "Powerball" : "Mega Ball"} ร้อน`}
                      order="desc"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <TopList
                      stats={data.specialStats}
                      title={`🧊 ${drawType === "POWERBALL" ? "Powerball" : "Mega Ball"} เย็น`}
                      order="asc"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-white/25">
              สถิตินี้ใช้เพื่อดูความถี่ที่ผ่านมาเท่านั้น — ลอตเตอรีแต่ละงวดเป็นอิสระจากกัน
              ไม่สามารถใช้ทำนายผลในอนาคตได้
            </p>
          </>
        )}
      </div>
    </div>
  )
}
