import { Router } from "express";
import db from "../lib/db";
import { verifyEmailWebhook } from "../middleware/verifyEmailWebhook";
import { parseInboundEmail, type InboundEmailPayload } from "../lib/parseInboundEmail";

const router = Router();

router.post("/inbound", verifyEmailWebhook, async (req, res) => {
  const parsed = parseInboundEmail(req.body as InboundEmailPayload);
  if (!parsed) {
    res.status(400).json({ error: "from and text/body are required" });
    return;
  }

  const ticket = await db.ticket.create({ data: parsed });
  res.status(201).json(ticket);
});

export default router;
