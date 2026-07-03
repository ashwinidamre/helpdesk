import { Router } from "express";
import multer from "multer";
import Parse = require("@sendgrid/inbound-mail-parser");
import db from "../lib/db";
import { verifyEmailWebhook } from "../middleware/verifyEmailWebhook";
import { parseInboundEmail } from "../lib/parseInboundEmail";
import boss, { CLASSIFY_TICKET_QUEUE, AUTO_RESOLVE_TICKET_QUEUE } from "../lib/boss";

const router = Router();
const upload = multer();

// SendGrid's Inbound Parse webhook POSTs multipart/form-data; `upload.any()` no-ops
// for any other content type (e.g. the JSON payloads used in manual/local testing),
// so both shapes are handled by the same route.
router.post("/inbound", verifyEmailWebhook, upload.any(), async (req, res) => {
  const parser = new Parse(
    { keys: ["to", "from", "subject", "text", "html"] },
    { body: req.body, files: (req.files as Express.Multer.File[]) ?? [] }
  );
  const data = parser.keyValues();

  const parsed = parseInboundEmail({ from: data.from, subject: data.subject, text: data.text });
  if (!parsed) {
    res.status(400).json({ error: "from and text/body are required" });
    return;
  }

  const ticket = await db.ticket.create({ data: parsed });
  await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId: ticket.id });
  await boss.send(AUTO_RESOLVE_TICKET_QUEUE, { ticketId: ticket.id });
  res.status(201).json(ticket);
});

export default router;
