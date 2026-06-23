"use client"

import { useEffect, useState } from "react"

interface Props {
  cutoffAt: string    // ISO string
  drawDate: string    // ISO string
  nextDrawDate?: string // ISO string — next draw after this one
  drawLabel: string
}

function formatCountdown(ms: number) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h} ชม. ${m} นาที`
  return `${m} นาที`
}

function formatTimeThai(date: Date) {
  return date.toLocaleString("th-TH", {
    timeZone: "America/Los_Angeles",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " น."
}

export function CutoffBadge({ cutoffAt, drawDate, nextDrawDate, drawLabel }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const cutoff = new Date(cutoffAt)
  const draw = new Date(drawDate)
  const msLeft = cutoff.getTime() - now.getTime()
  const countdown = formatCountdown(msLeft)
  const isOpen = msLeft > 0

  if (isOpen) {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-emerald-400 font-semibold">
            ซื้อก่อน {formatTimeThai(cutoff)} = ได้งวด {formatTimeThai(draw)}
          </span>
        </div>
        {countdown && (
          <p className="text-center text-xs text-white/30">ปิดรับอีก {countdown}</p>
        )}
      </div>
    )
  }

  // Cutoff passed
  if (nextDrawDate) {
    const nextDraw = new Date(nextDrawDate)
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm">
        <span className="text-amber-400">
          ⚠️ งวดนี้ปิดรับแล้ว — ซื้อตอนนี้ได้งวด{" "}
          <span className="font-semibold">{formatTimeThai(nextDraw)}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/40">
      ปิดรับออเดอร์แล้ว — รอรอบถัดไป
    </div>
  )
}
