import Link from "next/link"
import { LotteryPurchasePanel } from "@/components/lottery/LotteryPurchasePanel"

export default function PowerBallPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Power Ball</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <LotteryPurchasePanel title="Power Ball" drawType="POWERBALL" accentClass="text-rose-600" />
      </div>
    </div>
  )
}
