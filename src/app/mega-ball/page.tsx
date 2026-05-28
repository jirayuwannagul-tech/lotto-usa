import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LotteryPurchasePanel } from "@/components/lottery/LotteryPurchasePanel"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPurchasableDraw, syncUpcomingDraws } from "@/lib/draw-schedule"

export const dynamic = "force-dynamic"

export default async function MegaBallPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/login")

  await syncUpcomingDraws(prisma)

  const draw = await getPurchasableDraw(prisma, "MEGA_MILLIONS")

  if (!draw) redirect("/")

  return (
    <div className="min-h-screen bg-[#09090b] px-5 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[#c9a84c]/20 bg-[#0d0d0d] p-8">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-white">🔵 Mega Ball</p>
          <Link href="/" className="text-sm font-semibold text-white/40 transition hover:text-white">
            ← กลับหน้าแรก
          </Link>
        </div>

        <LotteryPurchasePanel
          title="Mega Ball"
          drawType="MEGA_MILLIONS"
          drawDateLabel={new Date(draw.drawDate).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }) + " น."}
          accentClass="text-sky-400"
        />
      </div>
    </div>
  )
}
