import { Router } from "express";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import * as Sentry from "@sentry/node";
import type { TicketStatus, TicketCategory } from "@prisma/client";
import db from "../lib/db";
import { requireAuth } from "../middleware/requireAuth";
import { TICKET_CATEGORIES } from "../lib/ticketCategories";

const router = Router();

router.use(requireAuth);

const TICKET_STATUSES: TicketStatus[] = ["NEW", "PROCESSING", "OPEN", "RESOLVED", "CLOSED"];

router.get("/", async (req, res) => {
  const { status, category, search, resolvedByAi } = req.query as {
    status?: TicketStatus;
    category?: TicketCategory;
    search?: string;
    resolvedByAi?: string;
  };

  const tickets = await db.ticket.findMany({
    where: {
      resolvedByAi: resolvedByAi === "true",
      ...(status && { status }),
      ...(category && { category }),
      ...(search?.trim() && {
        OR: [
          { subject: { contains: search.trim(), mode: "insensitive" } },
          { body: { contains: search.trim(), mode: "insensitive" } },
          { senderEmail: { contains: search.trim(), mode: "insensitive" } },
          { senderName: { contains: search.trim(), mode: "insensitive" } },
        ],
      }),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(tickets);
});

router.get("/stats", async (req, res) => {
  const [totalTickets, openTickets, resolvedByAiCount, resolvedTickets] = await Promise.all([
    db.ticket.count(),
    db.ticket.count({ where: { status: "OPEN" } }),
    db.ticket.count({ where: { resolvedByAi: true } }),
    db.ticket.findMany({
      where: { status: { in: ["RESOLVED", "CLOSED"] } },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  const resolvedByAiPercent = totalTickets > 0 ? (resolvedByAiCount / totalTickets) * 100 : 0;

  const avgResolutionTimeMs =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce(
          (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
          0
        ) / resolvedTickets.length
      : null;

  res.json({ totalTickets, openTickets, resolvedByAiPercent, avgResolutionTimeMs });
});

function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

router.get("/stats/daily", async (req, res) => {
  const DAYS = 30;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (DAYS - 1));

  const tickets = await db.ticket.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    counts.set(localDateKey(d), 0);
  }

  for (const t of tickets) {
    const key = localDateKey(t.createdAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  res.json(Array.from(counts, ([date, count]) => ({ date, count })));
});

router.get("/:id", async (req, res) => {
  const ticket = await db.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.patch("/:id", async (req, res) => {
  const { status, category, assignedToId } = req.body as {
    status?: TicketStatus;
    category?: TicketCategory | null;
    assignedToId?: string | null;
  };

  if (status !== undefined && !TICKET_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (category !== undefined && category !== null && !TICKET_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  if (assignedToId) {
    const assignee = await db.user.findUnique({ where: { id: assignedToId } });
    if (!assignee || assignee.deletedAt) {
      res.status(400).json({ error: "Invalid assignedToId" });
      return;
    }
  }

  const ticket = await db.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
      ...(assignedToId !== undefined && { assignedToId }),
    },
  });

  res.json(ticket);
});

router.post("/:id/reply", async (req, res) => {
  const { body } = req.body as { body: string };
  if (!body?.trim()) {
    res.status(400).json({ error: "Reply body required" });
    return;
  }

  const [reply] = await db.$transaction([
    db.reply.create({ data: { body, ticketId: req.params.id } }),
    db.ticket.update({ where: { id: req.params.id }, data: { status: "RESOLVED" } }),
  ]);

  res.status(201).json(reply);
});

router.post("/:id/polish-reply", async (req, res) => {
  const { body } = req.body as { body: string };
  if (!body?.trim()) {
    res.status(400).json({ error: "Reply body required" });
    return;
  }

  const ticket = await db.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        "You polish a support agent's draft reply to a customer ticket. " +
        "Improve grammar, clarity, and tone (professional and friendly) without changing its meaning, " +
        "adding new facts, or removing information. Respond with only the polished reply text.",
      prompt: `Ticket subject: ${ticket.subject}\nCustomer message: ${ticket.body}\n\nAgent's draft reply:\n${body}`,
    });
    res.json({ body: text });
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
    res.status(502).json({ error: "Failed to polish reply" });
  }
});

router.post("/:id/summarize", async (req, res) => {
  const ticket = await db.ticket.findUnique({
    where: { id: req.params.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const conversation = [
    `Customer (${ticket.senderName ?? ticket.senderEmail}): ${ticket.body}`,
    ...ticket.replies.map((reply) => `Agent: ${reply.body}`),
  ].join("\n\n");

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        "You summarize a customer support ticket and its conversation history for a support agent. " +
        "Write a concise summary (2-4 sentences) covering the customer's issue, key details, and the current " +
        "state of the conversation. Respond with only the summary text.",
      prompt: `Ticket subject: ${ticket.subject}\n\nConversation:\n${conversation}`,
    });

    const updated = await db.ticket.update({
      where: { id: req.params.id },
      data: { aiSummary: text },
    });

    res.json({ aiSummary: updated.aiSummary });
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
    res.status(502).json({ error: "Failed to summarize ticket" });
  }
});

export default router;
