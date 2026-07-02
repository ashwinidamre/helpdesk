import type { Request, Response } from "express";
import db from "./db";

const SESSION_COOKIE = "session_id";
const SESSION_DAYS = 7;

export async function createSession(userId: string, res: Response): Promise<void> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({ data: { id, userId, expiresAt } });

  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function getSession(req: Request) {
  const sessionId = req.cookies[SESSION_COOKIE] as string | undefined;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
    if (session) await db.session.delete({ where: { id: sessionId } });
    return null;
  }

  return session;
}

export async function deleteSession(req: Request, res: Response): Promise<void> {
  const sessionId = req.cookies[SESSION_COOKIE] as string | undefined;
  if (sessionId) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  res.clearCookie(SESSION_COOKIE);
}
