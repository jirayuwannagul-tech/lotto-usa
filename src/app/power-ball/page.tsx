import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LotteryPurchasePanel } from "@/components/lottery/LotteryPurchasePanel"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPurchasableDraw, syncUpcomingDraws } from "@/lib/draw-schedule"

export const dynamic = "force-dynamic"

export default async function PowerBallPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/login")

  await syncUpcomingDraws(prisma)

  const draw = await getPurchasableDraw(prisma, "POWERBALL")

  if (!draw) redirect("/")

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Power Ball</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <LotteryPurchasePanel
          title="Power Ball"
          drawType="POWERBALL"
          drawDateLabel={new Date(draw.drawDate).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }) + " น."}
          accentClass="text-rose-600"
        />
      </div>
    </div>
  )
}
