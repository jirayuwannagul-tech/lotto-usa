import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncUpcomingDraws } from "@/lib/draw-schedule"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncUpcomingDraws(prisma)
  return NextResponse.json(result)
}
