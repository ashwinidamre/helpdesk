import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../lib/db";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/assignable", requireAuth, async (_req, res) => {
  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

router.use(requireAdmin);

router.get("/", async (_req, res) => {
  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

router.post("/", async (req, res) => {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password required" });
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { name, email, password: hashed, role: "AGENT" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

router.patch("/:id", async (req, res) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email) {
    res.status(400).json({ error: "Name and email required" });
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.id !== req.params.id) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const user = await db.user.update({
    where: { id: req.params.id },
    data: {
      name,
      email,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json(user);
});

router.delete("/:id", async (req, res) => {
  const target = await db.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.role === "ADMIN") {
    res.status(403).json({ error: "Admin users cannot be deleted" });
    return;
  }

  await db.$transaction([
    db.user.update({ where: { id: target.id }, data: { deletedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: target.id } }),
    db.ticket.updateMany({ where: { assignedToId: target.id }, data: { assignedToId: null } }),
  ]);

  res.json({ ok: true });
});

export default router;
