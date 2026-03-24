"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Order {
  id: string
  status: string
  totalUSD: string
  totalTHB: string
  rateUsed: string
  draw: { type: string; drawDate: string }
  items: { id: string; mainNumbers: string; specialNumber: string }[]
  payment: { id: string; status: string } | null
}

export default function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const getDrawLabel = (type: string) => (type === "POWERBALL" ? "🔴 พาวเวอร์บอล" : "🔵 เมกา มิลเลียนส์")

  useEffect(() => {
    fetch(`/api/orders/${orderId}`).then((r) => r.json()).then(setOrder)
  }, [orderId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !order) return
    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("orderId", order.id)
    formData.append("slip", file)

    const res = await fetch("/api/payments", { method: "POST", body: formData })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? "เกิดข้อผิดพลาด")
    } else {
      setDone(true)
    }
  }

  if (!order) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <p className="text-white/50">กำลังโหลด...</p>
    </div>
  )

  const bankName = process.env.NEXT_PUBLIC_BANK_NAME ?? "ธนาคารกสิกรไทย"
  const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "xxx-x-xxxxx-x"
  const bankHolder = process.env.NEXT_PUBLIC_BANK_HOLDER ?? "ชื่อบัญชี"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">← กลับ</button>
          <span className="text-white font-semibold">💳 ชำระเงิน</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {done ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-10 text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-white text-xl font-bold">ส่งสลิปเรียบร้อย</h2>
              <p className="text-white/60">รอผู้ดูแลระบบตรวจสลิปและยืนยัน</p>
              <p className="text-white/40 text-sm">ระบบจะแจ้งผลให้คุณหลังตรวจสอบเสร็จ</p>
              <Button onClick={() => router.push("/dashboard")} className="bg-blue-500 hover:bg-blue-600 text-white">
                กลับไปที่แดชบอร์ด
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Order summary */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">
                  สรุปออเดอร์ — {getDrawLabel(order.draw.type)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 font-mono text-sm">
                    <span className="text-white/40 w-8">{i + 1}.</span>
                    <span className="text-white">{item.mainNumbers}</span>
                    <span className={`font-bold ${order.draw.type === "POWERBALL" ? "text-red-400" : "text-blue-400"}`}>
                      ● {item.specialNumber}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>{order.items.length} ใบ × $3.50</span>
                    <span>${Number(order.totalUSD).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>อัตรา $1 = {Number(order.rateUsed).toFixed(2)} บาท</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-base">
                    <span>ยอดชำระ</span>
                    <span>{Number(order.totalTHB).toFixed(0)} บาท</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank info */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-blue-300 font-semibold">🏦 โอนเงินมาที่</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-white/50">ธนาคาร</span><span className="text-white">{bankName}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">ชื่อบัญชี</span><span className="text-white">{bankHolder}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50">เลขที่บัญชี</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{bankAccount}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(bankAccount)}
                        className="text-blue-400 text-xs hover:text-blue-300"
                      >
                        📋 คัดลอก
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/10">
                    <span className="text-white/50">จำนวนเงิน</span>
                    <span className="text-yellow-400 font-bold">{Number(order.totalTHB).toFixed(0)} บาท</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slip upload */}
            <form onSubmit={handleSubmit}>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-3">
                  <p className="text-white font-medium">📎 แนบสลิปการโอน</p>
                  <label className="block cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? "border-green-500/50 bg-green-500/10" : "border-white/20 hover:border-white/40"}`}>
                      {file ? (
                        <div>
                          <p className="text-green-400 font-medium">✅ {file.name}</p>
                          <p className="text-white/40 text-sm">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-3xl mb-2">📷</p>
                          <p className="text-white/60">แตะเพื่อเลือกรูปสลิป</p>
                          <p className="text-white/30 text-sm">รองรับ JPG, PNG</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <p className="text-white/30 text-xs text-center">
                    ⚠️ ออเดอร์จะได้รับการยืนยันหลังผู้ดูแลระบบตรวจสลิป
                  </p>
                  <Button type="submit" disabled={!file || loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-40">
                    {loading ? "กำลังส่งสลิป..." : "ส่งสลิป & ยืนยันออเดอร์"}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
