import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminHash = await bcrypt.hash("admin1234", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@lottousа.com" },
    update: {},
    create: {
      email: "admin@lottousа.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  })
  console.log("✅ Admin:", admin.email)

  // Create test customer
  const customerHash = await bcrypt.hash("test1234", 12)
  const customer = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "สมชาย ทดสอบ",
      phone: "089-000-0000",
      lineId: "somchai_test",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
  })
  console.log("✅ Customer:", customer.email)

  // Create upcoming draws
  // Powerball: Mon, Wed, Sat — cutoff 7AM LA = 15:00 UTC (PDT)
  const now = new Date()

  const powerballDraw = await prisma.draw.create({
    data: {
      type: "POWERBALL",
      drawDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      cutoffAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 2 days + 15h
      jackpot: "$450,000,000",
      isOpen: true,
    },
  })
  console.log("✅ Powerball draw created:", powerballDraw.id)

  const megaDraw = await prisma.draw.create({
    data: {
      type: "MEGA_MILLIONS",
      drawDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      cutoffAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      jackpot: "$280,000,000",
      isOpen: true,
    },
  })
  console.log("✅ Mega Millions draw created:", megaDraw.id)

  console.log("\n🎱 Seed complete!")
  console.log("Admin login: admin@lottousа.com / admin1234")
  console.log("Customer login: test@example.com / test1234")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
