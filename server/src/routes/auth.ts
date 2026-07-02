import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../lib/db";
import { createSession, deleteSession } from "../lib/session";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await createSession(user.id, res);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/logout", requireAuth, async (req, res) => {
  await deleteSession(req, res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.user!;
  res.json({ id, name, email, role });
});

export default router;
