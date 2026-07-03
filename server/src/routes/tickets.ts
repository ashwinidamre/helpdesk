import { Router } from "express";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { TicketStatus, TicketCategory } from "@prisma/client";
import db from "../lib/db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

const TICKET_STATUSES: TicketStatus[] = ["OPEN", "RESOLVED", "CLOSED"];
const TICKET_CATEGORIES: TicketCategory[] = [
  "GENERAL_QUESTION",
  "TECHNICAL_QUESTION",
  "REFUND_QUESTION",
];

router.get("/", async (req, res) => {
  const { status, category } = req.query as {
    status?: TicketStatus;
    category?: TicketCategory;
  };

  const tickets = await db.ticket.findMany({
    where: {
      ...(status && { status }),
      ...(category && { category }),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(tickets);
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
      model: openai("gpt-5-nano"),
      system:
        "You polish a support agent's draft reply to a customer ticket. " +
        "Improve grammar, clarity, and tone (professional and friendly) without changing its meaning, " +
        "adding new facts, or removing information. Respond with only the polished reply text.",
      prompt: `Ticket subject: ${ticket.subject}\nCustomer message: ${ticket.body}\n\nAgent's draft reply:\n${body}`,
    });
    res.json({ body: text });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to polish reply" });
  }
});

export default router;
