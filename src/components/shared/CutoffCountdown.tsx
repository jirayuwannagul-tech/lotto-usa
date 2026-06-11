"use client"

import { useEffect, useState } from "react"

interface Props {
  cutoffAt: string
  drawDate: string
  drawType: string
  compact?: boolean
}

export function CutoffCountdown({ cutoffAt, drawDate, drawType, compact = false }: Props) {
  const [timeLeft, setTimeLeft] = useState("")
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    function update() {
      const diff = new Date(cutoffAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft("00:00:00")
        setIsOpen(false)
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [cutoffAt])

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
          isOpen ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
        }`}
      >
        <div className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500" : "bg-rose-500"}`} />
        <span className={`font-mono text-xs font-semibold ${isOpen ? "text-emerald-700" : "text-rose-700"}`}>
          {isOpen ? `ปิดรับใน ${timeLeft}` : "ปิดรับแล้ว"}
        </span>
      </div>
    )
  }

  const drawLabel = drawType === "POWERBALL" ? "พาวเวอร์บอล" : "เมกา มิลเลียนส์"
  const drawDateTH = new Date(drawDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className={`rounded-2xl border p-4 ${isOpen ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500" : "bg-rose-500"}`} />
        <span className={`text-sm font-medium ${isOpen ? "text-emerald-700" : "text-rose-700"}`}>
          {isOpen ? "กำลังรับออเดอร์" : "ปิดรับออเดอร์แล้ว"}
        </span>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-950">{isOpen ? timeLeft : "ปิดรับแล้ว"}</div>
      <div className="mt-1 text-sm text-slate-600">
        {drawLabel} — งวด {drawDateTH}
      </div>
    </div>
  )
}
