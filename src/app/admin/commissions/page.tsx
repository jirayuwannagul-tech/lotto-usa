"use client"

import { useEffect, useState } from "react"

interface CommissionGroup {
  referrerId: string
  referrerName: string
  referrerEmail: string
  referrerPhone: string | null
  totalAmountTHB: number
  commissions: {
    id: string
    amountTHB: string
    profitTHB: string
    status: string
    createdAt: string
    order: { id: string; draw: { type: string; drawDate: string } }
  }[]
}

export default function CommissionsPage() {
  const [groups, setGroups] = useState<CommissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [note, setNote] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/commissions?status=APPROVED")
    const data = await res.json().catch(() => [])
    setGroups(data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handlePay(referrerId: string, name: string) {
    if (!confirm(`จ่าย commission ทั้งหมดของ ${name} ใช่ไหม?`)) return
    setPayingId(referrerId)
    await fetch("/api/admin/commissions/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId, note }),
    })
    setPayingId(null)
    await load()
  }

  const totalPending = groups.reduce((s, g) => s + g.totalAmountTHB, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Commission Payout</h1>
          <p className="text-sm text-slate-400">รายการค้างจ่ายทั้งหมด</p>
        </div>
        <div className="rounded-2xl bg-amber-500/20 px-5 py-3 text-center">
          <p className="text-xs text-amber-300">ยอดรวมค้างจ่าย</p>
          <p className="text-2xl font-bold text-amber-400">
            {totalPending.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm text-slate-400">หมายเหตุการจ่าย (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น โอนผ่าน PromptPay วันที่ ..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      {loading ? (
        <p className="text-slate-400">กำลังโหลด...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
          ไม่มีรายการค้างจ่าย
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.referrerId} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{g.referrerName}</p>
                  <p className="text-sm text-slate-400">{g.referrerEmail}</p>
                  {g.referrerPhone && (
                    <p className="text-sm text-slate-400">{g.referrerPhone}</p>
                  )}
                  <p className="mt-2 text-sm text-slate-300">
                    {g.commissions.length} รายการ •{" "}
                    <span className="font-semibold text-amber-400">
                      {g.totalAmountTHB.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ฿
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handlePay(g.referrerId, g.referrerName)}
                  disabled={payingId === g.referrerId}
                  className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                  {payingId === g.referrerId ? "กำลังจ่าย..." : "บันทึกการจ่าย"}
                </button>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-400 hover:text-white">
                  ดูรายละเอียด ({g.commissions.length} รายการ)
                </summary>
                <div className="mt-3 space-y-2">
                  {g.commissions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 text-sm"
                    >
                      <span className="text-slate-300">
                        {c.order.draw.type === "POWERBALL" ? "Powerball" : "Mega Millions"}{" "}
                        {new Date(c.order.draw.drawDate).toLocaleDateString("th-TH")}
                      </span>
                      <span className="font-semibold text-amber-400">
                        {Number(c.amountTHB).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
