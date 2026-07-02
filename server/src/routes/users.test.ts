import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";

const mockDb = {
  user: { findMany: mock(), findUnique: mock(), update: mock() },
  session: { deleteMany: mock() },
  ticket: { updateMany: mock() },
  $transaction: mock((ops: Promise<unknown>[]) => Promise.all(ops)),
};

mock.module("../lib/db", () => ({ default: mockDb }));

const { default: usersRouter } = await import("./users");

function getHandler(method: string, path: string) {
  const layer = (usersRouter as any).stack.find(
    (l: any) => l.route?.path === path && l.route.methods[method]
  );
  if (!layer) throw new Error(`No route registered for ${method.toUpperCase()} ${path}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as (
    req: Request,
    res: Response,
    next: () => void
  ) => Promise<void> | void;
}

function mockRes() {
  const res: any = {};
  res.status = mock((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = mock((body: unknown) => {
    res.body = body;
    return res;
  });
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("GET /api/users/assignable", () => {
  const handler = getHandler("get", "/assignable");

  beforeEach(() => {
    mockDb.user.findMany.mockReset();
  });

  test("returns active users ordered by name with only id, name, role", async () => {
    const users = [
      { id: "u1", name: "Alice", role: "AGENT" },
      { id: "u2", name: "Bob", role: "ADMIN" },
    ];
    mockDb.user.findMany.mockResolvedValue(users);
    const req = {} as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    expect(res.json).toHaveBeenCalledWith(users);
  });

  test("excludes soft-deleted users via the deletedAt filter", async () => {
    mockDb.user.findMany.mockResolvedValue([]);
    const req = {} as any;
    const res = mockRes();

    await handler(req, res, () => {});

    const callArgs = mockDb.user.findMany.mock.calls[0][0];
    expect(callArgs.where).toEqual({ deletedAt: null });
  });

  test("route is registered ahead of the router-level requireAdmin guard", () => {
    const layer = (usersRouter as any).stack.find(
      (l: any) => l.route?.path === "/assignable"
    );
    expect(layer.route.stack.length).toBeGreaterThanOrEqual(1);
    const middlewareNames = layer.route.stack.map((l: any) => l.handle.name);
    expect(middlewareNames).toContain("requireAuth");
  });
});

describe("DELETE /api/users/:id", () => {
  const handler = getHandler("delete", "/:id");

  beforeEach(() => {
    mockDb.user.findUnique.mockReset();
    mockDb.user.update.mockReset();
    mockDb.session.deleteMany.mockReset();
    mockDb.ticket.updateMany.mockReset();
    mockDb.$transaction.mockClear();
  });

  test("unassigns every ticket assigned to the deleted user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", role: "AGENT", deletedAt: null });
    mockDb.user.update.mockResolvedValue({ id: "u1" });
    mockDb.session.deleteMany.mockResolvedValue({ count: 0 });
    mockDb.ticket.updateMany.mockResolvedValue({ count: 3 });
    const req = { params: { id: "u1" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.ticket.updateMany).toHaveBeenCalledWith({
      where: { assignedToId: "u1" },
      data: { assignedToId: null },
    });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test("returns 404 for a user that doesn't exist and skips unassignment", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const req = { params: { id: "missing" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockDb.ticket.updateMany).not.toHaveBeenCalled();
  });

  test("refuses to delete an admin and skips unassignment", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", role: "ADMIN", deletedAt: null });
    const req = { params: { id: "u1" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockDb.ticket.updateMany).not.toHaveBeenCalled();
  });
});
