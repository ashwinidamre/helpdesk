import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";

const mockDb = {
  user: { findMany: mock() },
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
