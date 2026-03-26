"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Props {
  paymentId: string
  orderId: string
}

export function AdminApproveButton({ paymentId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function approve() {
    setLoading("approve")
    setMessage(null)
    const response = await fetch(`/api/payments/${paymentId}/approve`, { method: "PATCH" })
    const data = await response.json().catch(() => null)
    setLoading(null)

    if (!response.ok) {
      setMessage(data?.error ?? "อนุมัติออเดอร์ไม่สำเร็จ")
      return
    }

    if (data?.telegram?.ok === false) {
      const failed = Array.isArray(data?.telegram?.failed) ? data.telegram.failed : []
      const detail = failed
        .map((entry: { label?: string; error?: string }) => `${entry.label ?? "unknown"}: ${entry.error ?? "-"}`)
        .join(" | ")
      setMessage(`อนุมัติแล้ว แต่ส่ง Telegram ไม่ครบ${detail ? ` (${detail})` : ""}`)
    } else {
      setMessage("อนุมัติแล้ว และส่ง Telegram สำเร็จ")
    }

    router.refresh()
  }

  async function reject() {
    setLoading("reject")
    setMessage(null)
    await fetch(`/api/payments/${paymentId}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectNote }),
    })
    setLoading(null)
    setShowReject(false)
    router.refresh()
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <input
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="เหตุผล..."
          className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-slate-900"
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReject(false)}
            className="flex-1 border border-slate-200 text-xs text-slate-600"
          >
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={reject}
            disabled={loading === "reject"}
            className="flex-1 bg-rose-600 text-xs text-white hover:bg-rose-500"
          >
            {loading === "reject" ? "..." : "ยืนยันปฏิเสธ"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={approve}
        disabled={!!loading}
        className="bg-emerald-600 text-xs text-white hover:bg-emerald-500"
      >
        {loading === "approve" ? "..." : "อนุมัติ"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowReject(true)}
        className="border border-rose-200 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-700"
      >
        ปฏิเสธ
      </Button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  )
}
