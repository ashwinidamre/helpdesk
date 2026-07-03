import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from "../src/lib/aiAgent";

const db = new PrismaClient();

async function main() {
  const password = await bcrypt.hash(crypto.randomUUID(), 10);
  const user = await db.user.upsert({
    where: { email: AI_AGENT_EMAIL },
    update: {},
    create: { name: AI_AGENT_NAME, email: AI_AGENT_EMAIL, password, role: Role.AGENT },
  });
  console.log(`Seeded AI agent:`, user.email);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
