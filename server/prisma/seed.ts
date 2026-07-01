import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  const role = (process.env.SEED_ADMIN_ROLE ?? Role.ADMIN) as Role;

  if (!email || !plainPassword) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment");
  }
  if (role !== Role.ADMIN && role !== Role.AGENT) {
    throw new Error(`SEED_ADMIN_ROLE must be ${Role.ADMIN} or ${Role.AGENT}, got "${role}"`);
  }

  const password = await bcrypt.hash(plainPassword, 10);
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { name: "Admin", email, password, role },
  });
  console.log(`Seeded ${user.role.toLowerCase()}:`, user.email);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
