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

  async function approve() {
    setLoading("approve")
    await fetch(`/api/payments/${paymentId}/approve`, { method: "PATCH" })
    setLoading(null)
    router.refresh()
  }

  async function reject() {
    setLoading("reject")
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
    </div>
  )
}
