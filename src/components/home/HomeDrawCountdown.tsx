"use client"

import { useEffect, useMemo, useState } from "react"

interface HomeDrawCountdownProps {
  drawDate: string | null
}

function formatTimeLeft(targetAt: string, nowMs: number) {
  const diff = new Date(targetAt).getTime() - nowMs
  if (diff <= 0) return "กำลังออกรางวัล"

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days} วัน ${hours} ชม. ${minutes} นาที`
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function HomeDrawCountdown({ drawDate }: HomeDrawCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!drawDate) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [drawDate])

  const thaiDrawLabel = useMemo(() => {
    if (!drawDate) return "กำลังอัปเดตเวลา"
    return new Date(drawDate).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }) + " น."
  }, [drawDate])

  if (!drawDate) {
    return <p className="mt-3 text-sm text-slate-500">กำลังอัปเดตเวลาออกรางวัล</p>
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-slate-500">เวลาออกหวยไทย: {thaiDrawLabel}</p>
      <p className="text-sm font-semibold text-emerald-700">
        Countdown: {formatTimeLeft(drawDate, nowMs)}
      </p>
    </div>
  )
}
