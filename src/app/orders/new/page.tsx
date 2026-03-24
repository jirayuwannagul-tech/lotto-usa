"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { NumberPicker } from "@/components/customer/NumberPicker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LOTTERY_RULES, DrawType } from "@/lib/lottery-rules"

interface NumberSet { mainNumbers: string[]; specialNumber: string }
interface Draw { id: string; type: string; drawDate: string; cutoffAt: string; jackpot?: string }

function NewOrderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const drawId = searchParams.get("drawId")

  const [draw, setDraw] = useState<Draw | null>(null)
  const [rate, setRate] = useState(35)
  const [sets, setSets] = useState<NumberSet[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const getDrawLabel = (type: string) => (type === "POWERBALL" ? "🔴 พาวเวอร์บอล" : "🔵 เมกา มิลเลียนส์")

  useEffect(() => {
    if (drawId) {
      fetch(`/api/draws/${drawId}`).then((r) => r.json()).then(setDraw)
      fetch("/api/exchange-rate").then((r) => r.json()).then((d) => setRate(d.rate))
    }
  }, [drawId])

  async function handleConfirm(confirmedSets: NumberSet[]) {
    setSets(confirmedSets)
  }

  async function handleSubmitOrder() {
    if (!sets || !drawId) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawId, items: sets }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด")
      setSets(null)
      return
    }

    router.push(`/orders/${data.id}/pay`)
  }

  if (!draw) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <p className="text-white/50">กำลังโหลด...</p>
    </div>
  )

  const rule = LOTTERY_RULES[draw.type as DrawType]
  const pricePerTicket = rule.priceUSD + 1.5

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">← กลับ</button>
          <span className="text-white font-semibold">
            {getDrawLabel(draw.type)}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {!sets ? (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">เลือกตัวเลข</CardTitle>
              <p className="text-white/50 text-sm">
                งวด {new Date(draw.drawDate).toLocaleDateString("th-TH")} •
                ${pricePerTicket.toFixed(2)}/ใบ
              </p>
            </CardHeader>
            <CardContent>
              <NumberPicker
                drawType={draw.type as DrawType}
                onConfirm={handleConfirm}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">ยืนยันออเดอร์</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-white/50 text-sm w-12">ชุด {i + 1}</span>
                    <span className="font-mono text-white">{s.mainNumbers.join(" - ")}</span>
                    <span className={`font-bold ${draw.type === "POWERBALL" ? "text-red-400" : "text-blue-400"}`}>
                      ● {s.specialNumber}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-white/60">
                  <span>{sets.length} ใบ × ${pricePerTicket.toFixed(2)}</span>
                  <span>${(sets.length * pricePerTicket).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-white/60">
                  <span>อัตรา $1 = {rate.toFixed(2)} บาท</span>
                </div>
                <div className="flex justify-between text-white font-bold">
                  <span>ยอดที่ต้องชำระ</span>
                  <span>{(sets.length * pricePerTicket * rate).toFixed(0)} บาท</span>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSets(null)} className="flex-1 border-white/20 text-white hover:bg-white/10">
                  แก้ไขเลข
                </Button>
                <Button onClick={handleSubmitOrder} disabled={loading} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold">
                  {loading ? "กำลังสร้างออเดอร์..." : "ยืนยัน & ชำระเงิน →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <p className="text-white/50">กำลังโหลด...</p>
      </div>
    }>
      <NewOrderContent />
    </Suspense>
  )
}
