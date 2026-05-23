import { prisma } from "@/lib/prisma"
import { MARGIN_USD } from "@/lib/lottery-rules"

export const REFERRAL_PROFIT_SHARE_RATE = 50

// Keep for backward-compat — now a no-op since tables are in Prisma schema
export async function ensureReferralTables() {}

export function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase()
}

function createReferralCodeFromName(name: string) {
  const base = name
    .replace(/[^A-Za-z0-9ก-๙]/g, "")
    .toUpperCase()
    .slice(0, 4)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base || "LOTTO"}${suffix}`
}

export async function getReferrerByCode(code: string) {
  const normalized = normalizeReferralCode(code)
  return prisma.referrerProfile.findUnique({
    where: { referralCode: normalized },
  })
}

export async function appointReferrer(userId: string, name: string) {
  const existing = await prisma.referrerProfile.findUnique({ where: { userId } })
  if (existing) return existing

  let referralCode = createReferralCodeFromName(name)
  while (await prisma.referrerProfile.findUnique({ where: { referralCode } })) {
    referralCode = createReferralCodeFromName(name)
  }

  return prisma.referrerProfile.create({ data: { userId, referralCode } })
}

export async function getReferralMaps() {
  const [profiles, referrals] = await Promise.all([
    prisma.referrerProfile.findMany(),
    prisma.userReferral.findMany(),
  ])
  return { profiles, referrals }
}

export async function createCommissionForOrder(params: {
  orderId: string
  referredUserId: string
  itemCount: number
  rateUsed: number
}) {
  const referral = await prisma.userReferral.findUnique({
    where: { userId: params.referredUserId },
  })
  if (!referral) return null

  const totalProfitTHB = Number((MARGIN_USD * params.itemCount * params.rateUsed).toFixed(2))
  const amountTHB = Number((totalProfitTHB * 0.5).toFixed(2))
  const platformShareTHB = Number((totalProfitTHB - amountTHB).toFixed(2))

  await prisma.commission.upsert({
    where: { orderId: params.orderId },
    create: {
      orderId: params.orderId,
      referrerUserId: referral.referrerUserId,
      referredUserId: params.referredUserId,
      amountTHB,
      rate: REFERRAL_PROFIT_SHARE_RATE,
      profitTHB: totalProfitTHB,
      platformShareTHB,
    },
    update: {},
  })

  return { referrerUserId: referral.referrerUserId, amountTHB, profitTHB: totalProfitTHB, platformShareTHB }
}

export async function approveCommissionForOrder(orderId: string) {
  await prisma.commission.updateMany({
    where: { orderId, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date() },
  })
}

export async function cancelCommissionForOrder(orderId: string) {
  await prisma.commission.updateMany({
    where: { orderId },
    data: { status: "CANCELLED" },
  })
}
