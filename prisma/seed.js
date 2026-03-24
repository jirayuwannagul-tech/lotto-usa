const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash("admin1234", 12)
  await prisma.user.upsert({
    where: { email: "admin@lottousa.com" },
    update: {},
    create: { email: "admin@lottousa.com", name: "Admin", passwordHash: adminHash, role: "ADMIN" },
  })
  console.log("✅ Admin: admin@lottousa.com / admin1234")

  const customerHash = await bcrypt.hash("test1234", 12)
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", name: "สมชาย ทดสอบ", phone: "089-000-0000", passwordHash: customerHash, role: "CUSTOMER" },
  })
  console.log("✅ Customer: test@example.com / test1234")
}

main().catch(console.error).finally(() => prisma.$disconnect())
