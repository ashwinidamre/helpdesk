import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError("BAD_REQUEST", {
            message: "Signup is disabled",
          });
        },
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  basePath: "/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CLIENT_URL ?? "http://localhost:5173"],
  session: {
    modelName: "Session",
  },
  user: {
    modelName: "User",
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Reuse the existing bcryptjs hashing scheme (server/prisma/seed.ts) so
    // accounts created by the old Express auth keep working without a reset.
    password: {
      hash: (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
});
