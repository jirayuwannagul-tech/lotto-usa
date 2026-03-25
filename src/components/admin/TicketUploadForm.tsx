"use client"

import Image from "next/image"
import { useState } from "react"

interface DrawOption {
  id: string
  label: string
}

interface UploadCandidate {
  orderItemId: string
  orderId: string
  customerName: string
  customerEmail: string
  numbers: string
  orderStatus: string
}

interface UploadResult {
  success?: boolean
  requiresReview?: boolean
  ticketPhotoUrl?: string
  ocrRawText?: string
  ocrResults?: {
    mainNumbers: string[]
    specialNumber: string
  }[]
  matchGroups?: {
    playIndex: number
    numbers: string
    candidates: UploadCandidate[]
  }[]
  message?: string
}

export function TicketUploadForm({ draws }: { draws: DrawOption[] }) {
  const [drawId, setDrawId] = useState(draws[0]?.id ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedMatches, setSelectedMatches] = useState<Record<number, string>>({})
  const [confirming, setConfirming] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!drawId || !file) {
      setMessage("กรุณาเลือกงวดและไฟล์รูป")
      return
    }

    setLoading(true)
    setMessage(null)
    setResult(null)
    setSelectedMatches({})

    try {
      const formData = new FormData()
      formData.append("drawId", drawId)
      formData.append("ticket", file)

      const res = await fetch("/api/tickets/upload", { method: "POST", body: formData })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage(data?.error ?? "อัปโหลดรูปหวยไม่สำเร็จ")
        return
      }

      setResult(data)
      setMessage(data?.message ?? "AI อ่านข้อมูลจากรูปให้แล้ว")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    const selectedOrderItemIds = Object.values(selectedMatches).filter(Boolean)

    if (selectedOrderItemIds.length === 0 || !result?.ticketPhotoUrl) {
      setMessage("กรุณาเลือกรายการที่ต้องการยืนยัน")
      return
    }

    setConfirming(true)
    setMessage(null)

    try {
      const res = await fetch("/api/tickets/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemIds: selectedOrderItemIds,
          ticketPhotoUrl: result.ticketPhotoUrl,
          ocrRawText: result.ocrRawText,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setMessage(data?.error ?? "ยืนยันรายการไม่สำเร็จ")
        return
      }

      setMessage("ยืนยันรายการสำเร็จ และอัปเดตสถานะออเดอร์แล้ว")
      setResult(null)
      setSelectedMatches({})
      setFile(null)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">เลือกงวด</label>
          <select
            value={drawId}
            onChange={(e) => setDrawId(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950"
          >
            {draws.map((draw) => (
              <option key={draw.id} value={draw.id}>
                {draw.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">ไฟล์รูปหวย</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "กำลังให้ AI อ่านเลข..." : "อัปโหลดรูปหวยให้ AI ตรวจ"}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>

      {result && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-700">ผลจาก AI</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {result.ticketPhotoUrl ? (
                <Image
                  src={result.ticketPhotoUrl}
                  alt="Ticket Preview"
                  width={600}
                  height={800}
                  className="h-auto w-full"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">เลขที่ AI อ่านได้</p>
                {result.ocrResults && result.ocrResults.length > 0 ? (
                  <div className="mt-3 space-y-1 font-mono text-sm text-slate-700">
                    {result.ocrResults.map((play, index) => (
                      <p key={`${play.mainNumbers.join(",")}-${play.specialNumber}-${index}`}>
                        ชุด {index + 1}: {play.mainNumbers.join(",")} | {play.specialNumber}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">AI ยังอ่านเลขไม่ได้</p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">เลือกออเดอร์ที่ตรงกับตั๋ว</p>
                {result.matchGroups && result.matchGroups.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {result.matchGroups.map((group) => (
                      <div key={group.playIndex} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-950">ชุด {group.playIndex + 1}</p>
                        <p className="mt-1 font-mono text-sm text-slate-600">{group.numbers}</p>
                        {group.candidates.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {group.candidates.map((candidate) => (
                              <label
                                key={`${group.playIndex}-${candidate.orderItemId}`}
                                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3"
                              >
                                <input
                                  type="radio"
                                  name={`candidateOrderItem-${group.playIndex}`}
                                  value={candidate.orderItemId}
                                  checked={selectedMatches[group.playIndex] === candidate.orderItemId}
                                  onChange={(e) =>
                                    setSelectedMatches((current) => ({
                                      ...current,
                                      [group.playIndex]: e.target.value,
                                    }))
                                  }
                                  className="mt-1"
                                />
                                <div className="text-sm text-slate-600">
                                  <p className="font-semibold text-slate-950">{candidate.customerName}</p>
                                  <p>{candidate.customerEmail}</p>
                                  <p className="font-mono">{candidate.numbers}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-rose-600">ยังไม่เจอรายการที่ตรงกับชุดนี้</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-rose-600">
                    AI อ่านเลขได้ แต่ยังหาคู่ที่ตรงในระบบไม่เจอ ให้ตรวจรูปและออเดอร์ด้วยตัวเองก่อน
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming || Object.values(selectedMatches).filter(Boolean).length === 0}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {confirming ? "กำลังยืนยัน..." : "ยืนยันรายการนี้"}
                </button>
                <p className="text-sm text-slate-500">AI เป็นตัวช่วยอ่านเลข และแอดมินเป็นผู้ยืนยันขั้นสุดท้าย</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
