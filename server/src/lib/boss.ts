import PgBoss from "pg-boss";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";
export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

// Prisma's URL parser trims whitespace, but pg-boss's underlying pg-pool
// passes the connection string through verbatim — a trailing space (e.g.
// from a copy-pasted env var value) silently changes the target database
// name and pg-pool fails to connect.
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!.trim() });

boss.on("error", (err) => console.error("pg-boss error:", err));

export default boss;
