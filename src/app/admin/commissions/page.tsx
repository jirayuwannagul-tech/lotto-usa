"use client"

import { useEffect, useState } from "react"

interface CommissionEntry {
  id: string
  amountTHB: number
  amountUSD: number
  profitUSD: number
  itemCount: number
  status: string
  createdAt: string
  referredMemberName: string
  referredMemberPhone: string | null
  order: { id: string; draw: { type: string; drawDate: string } }
}

interface CommissionGroup {
  referrerId: string
  referrerName: string
  referrerEmail: string
  referrerPhone: string | null
  referralCode: string
  totalAmountTHB: number
  totalAmountUSD: number
  commissions: CommissionEntry[]
}

function fmtUSD(n: number) {
  return `$${n.toFixed(2)}`
}

function fmtTHB(n: number) {
  return `${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })} ฿`
}

export default function CommissionsPage() {
  const [groups, setGroups] = useState<CommissionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

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

  const totalUSD = groups.reduce((s, g) => s + g.totalAmountUSD, 0)
  const totalTHB = groups.reduce((s, g) => s + g.totalAmountTHB, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">ADMIN / COMMISSIONS</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">สรุปค่าคอมผู้แนะนำ</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          กำไรต่อใบ $1.50 แบ่ง 50% → ผู้แนะนำได้ <span className="font-semibold text-slate-950">$0.75 / ใบ</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-700">ยอดค้างจ่าย (USD)</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-amber-800">{fmtUSD(totalUSD)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">ยอดค้างจ่าย (THB)</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{fmtTHB(totalTHB)}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">หมายเหตุการจ่าย (ไม่บังคับ)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น โอนผ่าน PromptPay วันที่ ..."
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">กำลังโหลด...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
          ไม่มีรายการค้างจ่าย
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.referrerId} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-slate-950">{g.referrerName}</span>
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-800">
                      {g.referralCode}
                    </span>
                  </div>
                  {g.referrerPhone && (
                    <p className="text-sm text-slate-500">{g.referrerPhone}</p>
                  )}
                  <p className="text-sm text-slate-500">{g.commissions.length} ออเดอร์</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">{fmtUSD(g.totalAmountUSD)}</p>
                    <p className="text-sm text-slate-400">{fmtTHB(g.totalAmountTHB)}</p>
                  </div>
                  <button
                    onClick={() => handlePay(g.referrerId, g.referrerName)}
                    disabled={payingId === g.referrerId}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {payingId === g.referrerId ? "กำลังจ่าย..." : "บันทึกการจ่าย"}
                  </button>
                </div>
              </div>

              {/* Detail table */}
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [g.referrerId]: !e[g.referrerId] }))}
                  className="w-full px-6 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  {expanded[g.referrerId] ? "▲ ซ่อนรายละเอียด" : "▼ ดูรายละเอียด"}
                </button>

                {expanded[g.referrerId] && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-t border-slate-100 bg-slate-50 text-left text-xs text-slate-400">
                        <tr>
                          <th className="px-6 py-3 font-medium">สมาชิก</th>
                          <th className="px-6 py-3 font-medium">ประเภท</th>
                          <th className="px-6 py-3 font-medium">วันที่</th>
                          <th className="px-6 py-3 font-medium text-right">ใบ</th>
                          <th className="px-6 py-3 font-medium text-right">กำไร</th>
                          <th className="px-6 py-3 font-medium text-right">ค่าคอม (50%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {g.commissions.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-950">
                              {c.referredMemberName}
                              {c.referredMemberPhone && (
                                <span className="ml-1 text-xs text-slate-400">{c.referredMemberPhone}</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {c.order.draw.type === "POWERBALL" ? "🔴 Powerball" : "🔵 Mega Millions"}
                            </td>
                            <td className="px-6 py-3 text-slate-500">
                              {new Date(c.order.draw.drawDate).toLocaleDateString("th-TH", { timeZone: "America/Los_Angeles" })}
                            </td>
                            <td className="px-6 py-3 text-right">{c.itemCount}</td>
                            <td className="px-6 py-3 text-right text-slate-600">{fmtUSD(c.profitUSD)}</td>
                            <td className="px-6 py-3 text-right font-semibold text-amber-600">
                              {fmtUSD(c.amountUSD)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                          <td colSpan={4} className="px-6 py-3 text-slate-950">รวม</td>
                          <td className="px-6 py-3 text-right text-slate-600">
                            {fmtUSD(g.commissions.reduce((s, c) => s + c.profitUSD, 0))}
                          </td>
                          <td className="px-6 py-3 text-right text-amber-600">
                            {fmtUSD(g.totalAmountUSD)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
