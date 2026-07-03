import PgBoss from "pg-boss";

export const CLASSIFY_TICKET_QUEUE = "classify-ticket";
export const AUTO_RESOLVE_TICKET_QUEUE = "auto-resolve-ticket";

const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });

boss.on("error", (err) => console.error("pg-boss error:", err));

export default boss;
