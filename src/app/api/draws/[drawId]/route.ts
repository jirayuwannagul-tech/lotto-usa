import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: Promise<{ drawId: string }> }) {
  const { drawId } = await params
  const draw = await prisma.draw.findUnique({ where: { id: drawId } })
  if (!draw) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(draw)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ drawId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { drawId } = await params
  const data = await req.json()
  const draw = await prisma.draw.update({ where: { id: drawId }, data })
  return NextResponse.json(draw)
}
