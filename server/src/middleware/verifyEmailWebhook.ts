import type { Request, Response, NextFunction } from "express";

export function verifyEmailWebhook(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Email webhook is not configured" });
    return;
  }
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : undefined;
  if (req.get("x-webhook-secret") !== secret && querySecret !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
