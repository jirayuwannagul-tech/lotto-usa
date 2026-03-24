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
          className="text-xs border border-red-500/30 bg-red-500/10 text-white rounded px-2 py-1 w-full"
        />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} className="text-white/50 text-xs flex-1">ยกเลิก</Button>
          <Button size="sm" onClick={reject} disabled={loading === "reject"} className="bg-red-500 hover:bg-red-600 text-white text-xs flex-1">
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
        className="bg-green-500 hover:bg-green-600 text-white text-xs"
      >
        {loading === "approve" ? "..." : "✅ อนุมัติ"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowReject(true)}
        className="text-red-400 hover:text-red-300 text-xs border border-red-500/30"
      >
        ❌ ปฏิเสธ
      </Button>
    </div>
  )
}
