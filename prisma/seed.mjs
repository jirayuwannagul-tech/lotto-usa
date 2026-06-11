import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

function canSeedDemoData() {
  return process.env.ALLOW_DEMO_SEED === "1" || process.env.NODE_ENV !== "production"
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

async function seedDemoUsers(prisma) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@lottousa.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234"
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? "test@example.com"
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "test1234"

  const adminHash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "ADMIN", name: "Admin" },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  })

  const customerHash = await bcrypt.hash(customerPassword, 12)
  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      passwordHash: customerHash,
      role: "CUSTOMER",
      name: "สมชาย ทดสอบ",
      phone: "089-000-0000",
      lineId: "somchai_test",
    },
    create: {
      email: customerEmail,
      name: "สมชาย ทดสอบ",
      phone: "089-000-0000",
      lineId: "somchai_test",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
  })

  console.log(`Seeded demo users: ${adminEmail}, ${customerEmail}`)
}

async function main() {
  if (!canSeedDemoData()) {
    console.log("Skipping demo seed. Set ALLOW_DEMO_SEED=1 to seed production-like environments.")
    return
  }

  const prisma = createPrismaClient()
  try {
    await seedDemoUsers(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
