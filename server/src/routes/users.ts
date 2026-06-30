import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../lib/db";
import { requireAdmin } from "../middleware/requireAuth";

const router = Router();

router.use(requireAdmin);

router.get("/", async (_req, res) => {
  const users = await db.user.findMany({
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

router.delete("/:id", async (req, res) => {
  await db.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
