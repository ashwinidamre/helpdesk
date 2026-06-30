# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scope.md` for full requirements and `implementation-plan.md` for phased task breakdown.

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite (port 5173) |
| Backend | Express + TypeScript + Bun (port 3000) |
| Database | PostgreSQL with Prisma ORM |
| AI | Claude API (Anthropic) |
| Auth | Database sessions |

### Project structure

```
/client   — React frontend (Vite)
/server   — Express backend
```

## Key conventions

- Use **Bun** as the runtime and package manager (not npm/yarn)
- Use **TypeScript** throughout — no plain JS files
- Use the **context7 MCP server** to fetch up-to-date docs for any library before making API calls (see Documentation section below)

## Dev commands

Run from the repo root. Each process must be started in a separate terminal.

```bash
bun run dev:server   # Express API on http://localhost:3000 (hot reload via bun --hot)
bun run dev:client   # Vite + React on http://localhost:5173
```

Database commands (run from `server/`):

```bash
bun run db:migrate   # apply pending migrations (bunx prisma migrate dev)
bun run db:seed      # seed admin@helpdesk.com / admin123
bun run db:studio    # open Prisma Studio
```

**Prisma client generation** — `bunx prisma generate` fails due to a Node.js version check (requires 20.19+, system has 20.17). Use this instead:

```bash
node server/node_modules/prisma/build/index.js generate
```

Run this any time `server/prisma/schema.prisma` changes.

## Environment variables

Copy `.env.example` to `server/.env` before starting the server:

```
DATABASE_URL="postgresql://user:password@localhost:5432/helpdesk"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

## Architecture

This is a Bun workspace monorepo with two packages: `server/` and `client/`.

### Server (`server/`) — Express + Prisma + Bun

- Entry: `src/index.ts` → imports `src/app.ts` and calls `.listen()`
- Routes mounted at `/api/auth`, `/api/tickets`, `/api/users`, `/api/health`
- **Auth**: DB-backed sessions stored in the `Session` table. `createSession` writes a `session_id` httpOnly cookie (7-day expiry). `requireAuth` / `requireAdmin` middleware in `src/middleware/requireAuth.ts` read that cookie, look up the session, and attach `req.user`.
- **Database**: Single `PrismaClient` instance exported from `src/lib/db.ts`. Schema lives in `prisma/schema.prisma`.

#### API surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Returns user JSON + sets `session_id` cookie |
| `POST` | `/api/auth/logout` | `requireAuth` | Deletes session, clears cookie |
| `GET` | `/api/auth/me` | `requireAuth` | Returns `{ id, name, email, role }` |
| `GET` | `/api/tickets` | `requireAuth` | List tickets; optional `?status=` `?category=` query params |
| `GET` | `/api/tickets/:id` | `requireAuth` | Single ticket with nested `assignedTo` and `replies` |
| `PATCH` | `/api/tickets/:id` | `requireAuth` | Update `status`, `category`, or `assignedToId` |
| `POST` | `/api/tickets/:id/reply` | `requireAuth` | Create reply; auto-sets ticket status to `RESOLVED` in a transaction |
| `GET` | `/api/users` | `requireAdmin` | List all users (id, name, email, role, createdAt) |
| `POST` | `/api/users` | `requireAdmin` | Create new agent (always `AGENT` role) |
| `DELETE` | `/api/users/:id` | `requireAdmin` | Delete user |
| `GET` | `/api/health` | — | Returns `{ status: "ok" }` |

### Client (`client/`) — React 18 + Vite + TanStack Query

- Vite proxies all `/api` requests to `http://localhost:3000`, so the client uses relative paths (e.g. `api.get("/auth/me")`).
- All fetch calls go through `src/lib/api.ts`, which always sends `credentials: "include"` (required for the session cookie).
- Auth state lives in a `["me"]` query in `App.tsx`. Every protected route checks `user` from that query — no separate auth context or store.
- `App.tsx` also polls `/api/health` every 30 seconds and shows a status banner at the top of the page.
- Client-side types in `src/types/index.ts` mirror the Prisma enums (`TicketStatus`, `TicketCategory`, `Role`).

#### Client routes

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login` | Redirects to `/dashboard` if already authed |
| `/dashboard` | `Dashboard` | Requires auth |
| `/tickets/:id` | `TicketDetail` | Requires auth |
| `*` | — | Redirects to `/dashboard` or `/login` |

> `/admin/agents` is linked from `Dashboard` for ADMIN users but has no route defined yet.

### Data model

| Model | Key fields |
|---|---|
| `User` | `id` (cuid), `name`, `email` (unique), bcrypt `password`, `role: ADMIN \| AGENT` |
| `Session` | `id` (UUID), `userId`, `expiresAt` — set as cookie |
| `Ticket` | `subject`, `body`, `senderEmail`, `senderName?`, `status`, `category?`, `aiSummary?`, optional `assignedToId` |
| `Reply` | `body`, `ticketId` — no userId, replies are anonymous agent replies; cascades on ticket delete |

Ticket status flow: `OPEN → RESOLVED` (auto on first reply via transaction) `→ CLOSED` (manual via PATCH or "Close ticket" button).

`aiSummary` is stored in the `Ticket` model but is not currently populated by any server logic — placeholder for future AI integration.

## Documentation

Use the **context7 MCP server** to fetch up-to-date documentation before working with any library in this project (Express, Prisma, Vite, TanStack Query, Tailwind, etc.). Prefer it over training-data knowledge for API signatures, config options, and migration guides.

```
# Example usage inside a conversation:
mcp__context7__resolve-library-id  →  mcp__context7__query-docs
```
