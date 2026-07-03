import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import * as Sentry from "@sentry/node";
import db from "./db";
import { TICKET_CATEGORIES } from "./ticketCategories";

export async function classifyTicket(ticketId: string) {
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        `Classify a customer support ticket into exactly one of these categories: ${TICKET_CATEGORIES.join(", ")}. ` +
        "Respond with only the category name, nothing else.",
      prompt: `Subject: ${ticket.subject}\n\nMessage: ${ticket.body}`,
    });

    const category = TICKET_CATEGORIES.find((c) => text.toUpperCase().includes(c));
    if (!category) {
      console.error(`Could not parse ticket category from AI response for ticket ${ticketId}: "${text}"`);
      return;
    }

    await db.ticket.update({ where: { id: ticketId }, data: { category } });
  } catch (err) {
    console.error(`Failed to classify ticket ${ticketId}:`, err);
    Sentry.captureException(err);
  }
}
