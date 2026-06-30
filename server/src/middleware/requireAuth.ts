import type { Request, Response, NextFunction } from "express";
import type { User } from "@prisma/client";
import { getSession } from "../lib/session";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = session.user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (session.user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.user = session.user;
  next();
}
