import { prisma } from "@/lib/prisma"
import { MARGIN_USD } from "@/lib/lottery-rules"

export const REFERRAL_PROFIT_SHARE_RATE = 50

type ReferrerProfileRow = {
  userId: string
  referralCode: string
}

type UserReferralRow = {
  userId: string
  referrerUserId: string
  referralCode: string
}

let ensurePromise: Promise<void> | null = null

function createReferralCodeFromName(name: string) {
  const base = name
    .replace(/[^A-Za-z0-9ก-๙]/g, "")
    .toUpperCase()
    .slice(0, 4)

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base || "LOTTO"}${suffix}`
}

export async function ensureReferralTables() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ReferrerProfile" (
          "userId" TEXT PRIMARY KEY,
          "referralCode" TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserReferral" (
          "userId" TEXT PRIMARY KEY,
          "referrerUserId" TEXT NOT NULL,
          "referralCode" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Commission" (
          "id" TEXT PRIMARY KEY,
          "orderId" TEXT NOT NULL UNIQUE,
          "referrerUserId" TEXT NOT NULL,
          "referredUserId" TEXT NOT NULL,
          "amountTHB" NUMERIC(12,2) NOT NULL,
          "rate" NUMERIC(5,2) NOT NULL DEFAULT 50,
          "profitTHB" NUMERIC(12,2) NOT NULL DEFAULT 0,
          "platformShareTHB" NUMERIC(12,2) NOT NULL DEFAULT 0,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "approvedAt" TIMESTAMP(3),
          "paidAt" TIMESTAMP(3)
        )
      `)

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Commission"
        ADD COLUMN IF NOT EXISTS "profitTHB" NUMERIC(12,2) NOT NULL DEFAULT 0
      `)

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Commission"
        ADD COLUMN IF NOT EXISTS "platformShareTHB" NUMERIC(12,2) NOT NULL DEFAULT 0
      `)

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Commission"
        ALTER COLUMN "rate" SET DEFAULT 50
      `)
    })()
  }

  await ensurePromise
}

export function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase()
}

export async function getReferrerByCode(code: string) {
  await ensureReferralTables()
  const normalized = normalizeReferralCode(code)

  const rows = await prisma.$queryRaw<ReferrerProfileRow[]>`
    SELECT "userId", "referralCode"
    FROM "ReferrerProfile"
    WHERE "referralCode" = ${normalized}
    LIMIT 1
  `

  return rows[0] ?? null
}

export async function appointReferrer(userId: string, name: string) {
  await ensureReferralTables()

  const existing = await prisma.$queryRaw<ReferrerProfileRow[]>`
    SELECT "userId", "referralCode"
    FROM "ReferrerProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `

  if (existing[0]) return existing[0]

  let referralCode = createReferralCodeFromName(name)

  while (true) {
    const taken = await prisma.$queryRaw<ReferrerProfileRow[]>`
      SELECT "userId", "referralCode"
      FROM "ReferrerProfile"
      WHERE "referralCode" = ${referralCode}
      LIMIT 1
    `

    if (!taken[0]) break
    referralCode = createReferralCodeFromName(name)
  }

  await prisma.$executeRaw`
    INSERT INTO "ReferrerProfile" ("userId", "referralCode")
    VALUES (${userId}, ${referralCode})
  `

  return { userId, referralCode }
}

export async function getReferralMaps() {
  await ensureReferralTables()

  const [profiles, referrals] = await Promise.all([
    prisma.$queryRaw<ReferrerProfileRow[]>`
      SELECT "userId", "referralCode" FROM "ReferrerProfile"
    `,
    prisma.$queryRaw<UserReferralRow[]>`
      SELECT "userId", "referrerUserId", "referralCode" FROM "UserReferral"
    `,
  ])

  return {
    profiles,
    referrals,
  }
}

export async function createCommissionForOrder(params: {
  orderId: string
  referredUserId: string
  itemCount: number
  rateUsed: number
}) {
  await ensureReferralTables()

  const referralRows = await prisma.$queryRaw<UserReferralRow[]>`
    SELECT "userId", "referrerUserId", "referralCode"
    FROM "UserReferral"
    WHERE "userId" = ${params.referredUserId}
    LIMIT 1
  `

  const referral = referralRows[0]
  if (!referral) return null

  const totalProfitTHB = Number((MARGIN_USD * params.itemCount * params.rateUsed).toFixed(2))
  const amountTHB = Number((totalProfitTHB * 0.5).toFixed(2))
  const platformShareTHB = Number((totalProfitTHB - amountTHB).toFixed(2))

  await prisma.$executeRaw`
    INSERT INTO "Commission" ("id", "orderId", "referrerUserId", "referredUserId", "amountTHB", "rate", "profitTHB", "platformShareTHB", "status")
    VALUES (${crypto.randomUUID()}, ${params.orderId}, ${referral.referrerUserId}, ${params.referredUserId}, ${amountTHB}, ${REFERRAL_PROFIT_SHARE_RATE}, ${totalProfitTHB}, ${platformShareTHB}, ${"PENDING"})
    ON CONFLICT ("orderId") DO NOTHING
  `

  return {
    referrerUserId: referral.referrerUserId,
    amountTHB,
    profitTHB: totalProfitTHB,
    platformShareTHB,
  }
}

export async function approveCommissionForOrder(orderId: string) {
  await ensureReferralTables()

  await prisma.$executeRaw`
    UPDATE "Commission"
    SET "status" = ${"APPROVED"}, "approvedAt" = CURRENT_TIMESTAMP
    WHERE "orderId" = ${orderId}
  `
}

export async function cancelCommissionForOrder(orderId: string) {
  await ensureReferralTables()

  await prisma.$executeRaw`
    UPDATE "Commission"
    SET "status" = ${"CANCELLED"}
    WHERE "orderId" = ${orderId}
  `
}
