import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LotteryPurchasePanel } from "@/components/lottery/LotteryPurchasePanel"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

export const dynamic = "force-dynamic"

export default async function MegaBallPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/admin")

  const drawCount = await prisma.draw.count({ where: { isOpen: true } })
  if (drawCount === 0) {
    await syncUpcomingDraws(prisma)
  }

  const draw = await prisma.draw.findFirst({
    where: { isOpen: true, type: "MEGA_MILLIONS" },
    orderBy: { drawDate: "asc" },
  })

  if (!draw) redirect("/")

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight text-slate-950">Mega Ball</p>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
            กลับหน้าแรก
          </Link>
        </div>

        <LotteryPurchasePanel
          title="Mega Ball"
          drawType="MEGA_MILLIONS"
          drawId={draw.id}
          accentClass="text-sky-600"
        />
      </div>
    </div>
  )
}
