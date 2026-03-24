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
      <p className="text-white font-medium text-sm">อัปโหลดรูปตั๋ว (OCR จับคู่อัตโนมัติ)</p>

      <label className="block cursor-pointer">
        <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${files.length ? "border-blue-500/50 bg-blue-500/10" : "border-white/20 hover:border-white/40"}`}>
          {files.length > 0 ? (
            <p className="text-blue-400 font-medium">เลือก {files.length} ไฟล์แล้ว</p>
          ) : (
            <>
              <p className="text-3xl mb-1">📷</p>
              <p className="text-white/60 text-sm">เลือกรูปตั๋วหลายรูปพร้อมกันได้</p>
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
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-white/50 text-xs text-center">กำลังอ่านตั๋ว... {progress}%</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm ${r.matched ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              {r.matched ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span className="text-white font-medium">{r.customerName}</span>
                  <span className="font-mono text-white/70">{r.numbers}</span>
                </div>
              ) : (
                <div>
                  <span className="text-red-400">⚠️ </span>
                  <span className="text-white/70">{r.message}</span>
                  {r.ocrResult && (
                    <p className="text-white/40 text-xs mt-1 font-mono">
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
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-40"
      >
        {loading ? "กำลังประมวลผล..." : `🔍 อัปโหลด & จับคู่ OCR (${files.length} ไฟล์)`}
      </Button>
    </div>
  )
}
