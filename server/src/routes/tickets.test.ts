import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { Request, Response } from "express";

const mockDb = {
  user: { findUnique: mock() },
  ticket: { update: mock() },
};

mock.module("../lib/db", () => ({ default: mockDb }));

const { default: ticketsRouter } = await import("./tickets");

function getHandler(method: string, path: string) {
  const layer = (ticketsRouter as any).stack.find(
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

describe("PATCH /api/tickets/:id — assignedToId validation", () => {
  const handler = getHandler("patch", "/:id");

  beforeEach(() => {
    mockDb.user.findUnique.mockReset();
    mockDb.ticket.update.mockReset();
  });

  test("rejects assignment to a user id that does not exist", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const req = { params: { id: "ticket-1" }, body: { assignedToId: "missing-user" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: "missing-user" } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid assignedToId" });
    expect(mockDb.ticket.update).not.toHaveBeenCalled();
  });

  test("rejects assignment to a soft-deleted user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", deletedAt: new Date() });
    const req = { params: { id: "ticket-1" }, body: { assignedToId: "u1" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid assignedToId" });
    expect(mockDb.ticket.update).not.toHaveBeenCalled();
  });

  test("accepts assignment to a valid, active user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", deletedAt: null });
    mockDb.ticket.update.mockResolvedValue({ id: "ticket-1", assignedToId: "u1" });
    const req = { params: { id: "ticket-1" }, body: { assignedToId: "u1" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { assignedToId: "u1" },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: "ticket-1", assignedToId: "u1" });
  });

  test("allows unassigning a ticket (assignedToId: null) without a user lookup", async () => {
    mockDb.ticket.update.mockResolvedValue({ id: "ticket-1", assignedToId: null });
    const req = { params: { id: "ticket-1" }, body: { assignedToId: null } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
    expect(mockDb.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { assignedToId: null },
    });
  });

  test("leaves assignment untouched when assignedToId is omitted from the body", async () => {
    mockDb.ticket.update.mockResolvedValue({ id: "ticket-1", status: "CLOSED" });
    const req = { params: { id: "ticket-1" }, body: { status: "CLOSED" } } as any;
    const res = mockRes();

    await handler(req, res, () => {});

    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
    expect(mockDb.ticket.update).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      data: { status: "CLOSED" },
    });
  });
});
