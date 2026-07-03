import { readFileSync } from "fs";
import { join } from "path";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import * as Sentry from "@sentry/node";
import db from "./db";
import { AI_AGENT_EMAIL } from "./aiAgent";

const KNOWLEDGE_BASE = readFileSync(join(import.meta.dir, "../../knowbase.md"), "utf-8");

export async function autoResolveTicket(ticketId: string) {
  const aiAgent = await db.user.findUnique({ where: { email: AI_AGENT_EMAIL } });
  if (!aiAgent) {
    console.error(`AI agent user not found (looked up by ${AI_AGENT_EMAIL}) - run "bun run db:seed:ai-agent"`);
  }

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: "PROCESSING",
      ...(aiAgent && { assignedToId: aiAgent.id }),
    },
  });

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        "You are an automated support agent. You may ONLY use the knowledge base below to answer " +
        "the customer's ticket - never invent information that isn't in it.\n\n" +
        `Knowledge base:\n${KNOWLEDGE_BASE}\n\n` +
        "Respond in exactly this format:\n" +
        "Line 1: the single word RESOLVED or UNRESOLVED\n" +
        "If RESOLVED, every remaining line is the reply to send to the customer, written in a " +
        "friendly, professional tone.\n" +
        "If UNRESOLVED, write nothing else.\n" +
        "Only answer RESOLVED if the knowledge base fully and confidently answers this specific ticket.",
      prompt: `Ticket subject: ${ticket.subject}\n\nCustomer message: ${ticket.body}`,
    });

    const [firstLine, ...rest] = text.trim().split("\n");
    const reply = rest.join("\n").trim();
    const resolved = firstLine.trim().toUpperCase().startsWith("RESOLVED") && reply.length > 0;

    if (resolved) {
      await db.$transaction([
        db.reply.create({ data: { body: reply, ticketId } }),
        db.ticket.update({
          where: { id: ticketId },
          data: { status: "RESOLVED", resolvedByAi: true },
        }),
      ]);
    } else {
      await db.ticket.update({
        where: { id: ticketId },
        data: { status: "OPEN", assignedToId: null },
      });
    }
  } catch (err) {
    console.error(`Failed to auto-resolve ticket ${ticketId}:`, err);
    Sentry.captureException(err);
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: "OPEN", assignedToId: null },
    });
  }
}
