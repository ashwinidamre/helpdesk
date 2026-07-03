import "./instrument";
import * as Sentry from "@sentry/node";
import app from "./app";
import boss, { CLASSIFY_TICKET_QUEUE, AUTO_RESOLVE_TICKET_QUEUE } from "./lib/boss";
import { classifyTicket } from "./lib/classifyTicket";
import { autoResolveTicket } from "./lib/autoResolveTicket";

const PORT = process.env.PORT ?? 3000;

async function main() {
  await boss.start();

  await boss.createQueue(CLASSIFY_TICKET_QUEUE);
  await boss.work<{ ticketId: string }>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    await classifyTicket(job.data.ticketId);
  });

  await boss.createQueue(AUTO_RESOLVE_TICKET_QUEUE);
  await boss.work<{ ticketId: string }>(AUTO_RESOLVE_TICKET_QUEUE, async ([job]) => {
    await autoResolveTicket(job.data.ticketId);
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  Sentry.captureException(err);
  process.exit(1);
});
