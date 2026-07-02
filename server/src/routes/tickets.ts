import { Router } from "express";
import type { TicketStatus, TicketCategory } from "@prisma/client";
import db from "../lib/db";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

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
    category?: TicketCategory;
    assignedToId?: string | null;
  };

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
      ...(status && { status }),
      ...(category && { category }),
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

export default router;
