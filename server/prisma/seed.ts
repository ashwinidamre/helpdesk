import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  const admin = await db.user.upsert({
    where: { email: "admin@helpdesk.com" },
    update: {},
    create: { name: "Admin", email: "admin@helpdesk.com", password, role: "ADMIN" },
  });
  console.log("Seeded admin:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
