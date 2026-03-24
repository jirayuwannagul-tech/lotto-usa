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
      <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${isOpen ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        <span className={`font-mono text-xs font-bold ${isOpen ? "text-green-400" : "text-red-400"}`}>
          {isOpen ? timeLeft : "ปิดแล้ว"}
        </span>
      </div>
    )
  }

  const drawLabel = drawType === "POWERBALL" ? "🔴 พาวเวอร์บอล" : "🔵 เมกา มิลเลียนส์"
  const drawDateTH = new Date(drawDate).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className={`rounded-xl p-4 border ${isOpen ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${isOpen ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
        <span className={`text-sm font-medium ${isOpen ? "text-green-400" : "text-red-400"}`}>
          {isOpen ? "กำลังรับออเดอร์" : "ปิดรับออเดอร์แล้ว"}
        </span>
      </div>
      <div className="text-3xl font-mono font-bold text-white">{timeLeft}</div>
      <div className="text-white/60 text-sm mt-1">
        {drawLabel} — งวด {drawDateTH}
      </div>
    </div>
  )
}
