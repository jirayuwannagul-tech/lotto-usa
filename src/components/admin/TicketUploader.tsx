"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface MatchResult {
  matched: boolean
  customerName?: string
  numbers?: string
  ocrResult?: { mainNumbers: string[]; specialNumber: string }
  ticketPhotoUrl?: string
  message?: string
}

export function TicketUploader({ drawId }: { drawId: string }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleUpload() {
    if (!files.length) return
    setLoading(true)
    setResults([])
    setProgress(0)

    const newResults: MatchResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("drawId", drawId)
      formData.append("ticket", file)

      const res = await fetch("/api/tickets/upload", { method: "POST", body: formData })
      const data = await res.json()
      newResults.push(data)
      setResults([...newResults])
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setLoading(false)
    setFiles([])
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-950">อัปโหลดรูปตั๋ว (OCR จับคู่อัตโนมัติ)</p>

      <label className="block cursor-pointer">
        <div
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
            files.length ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
          }`}
        >
          {files.length > 0 ? (
            <p className="font-medium text-sky-700">เลือก {files.length} ไฟล์แล้ว</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-950">เลือกรูปตั๋วหลายรูปพร้อมกันได้</p>
              <p className="mt-1 text-sm text-slate-500">ระบบจะอ่านเลขจากภาพและจับคู่ให้อัตโนมัติ</p>
            </>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>

      {loading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-xs text-slate-500">กำลังอ่านตั๋ว... {progress}%</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-sm ${
                r.matched ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              }`}
            >
              {r.matched ? (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-700">จับคู่สำเร็จ</span>
                  <span className="font-medium text-slate-950">{r.customerName}</span>
                  <span className="font-mono text-slate-600">{r.numbers}</span>
                </div>
              ) : (
                <div>
                  <span className="text-rose-700">{r.message}</span>
                  {r.ocrResult && (
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      OCR อ่านได้: {r.ocrResult.mainNumbers.join(",")} ● {r.ocrResult.specialNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!files.length || loading}
        className="w-full bg-slate-900 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
      >
        {loading ? "กำลังประมวลผล..." : `อัปโหลดและจับคู่ (${files.length} ไฟล์)`}
      </Button>
    </div>
  )
}
