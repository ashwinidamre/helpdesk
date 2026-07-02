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
EMAIL_WEBHOOK_SECRET="change-me"   # shared secret required by POST /api/email/inbound
```

## Architecture

This is a Bun workspace monorepo with two packages: `server/` and `client/`.

### Server (`server/`) — Express + Prisma + Bun

- Entry: `src/index.ts` → imports `src/app.ts` and calls `.listen()`
- Routes mounted at `/api/auth`, `/api/tickets`, `/api/users`, `/api/email`, `/api/health`
- **Auth**: DB-backed sessions stored in the `Session` table. Session helpers (`createSession`, `getSession`, `deleteSession`) live in `src/lib/session.ts`; middleware (`requireAuth`, `requireAdmin`) lives in `src/middleware/requireAuth.ts`.
  - Passwords are hashed with **bcryptjs** (`bcrypt.compare` on login against `User.password`).
  - `createSession` generates a `crypto.randomUUID()` session id, inserts a `Session` row (`userId`, `expiresAt` = now + 7 days), and sets it as the `session_id` cookie: `httpOnly`, `sameSite: "lax"`, `secure` only when `NODE_ENV === "production"`, `expires` matching the DB row.
  - `getSession` reads the `session_id` cookie, loads the session with its `user` relation, and treats a missing/expired session as unauthenticated — expired rows are deleted on read (lazy cleanup, no cron job).
  - `requireAuth` calls `getSession`; on failure responds `401 { error: "Unauthorized" }`, otherwise attaches `req.user` (a full Prisma `User`, typed via a `declare global { namespace Express { interface Request { user?: User } } }` augmentation in `requireAuth.ts`).
  - `requireAdmin` does the same but additionally checks `session.user.role === "ADMIN"`, responding `403 { error: "Forbidden" }` for non-admins.
  - `deleteSession` (used by logout) deletes the `Session` row for the cookie's id (ignores errors if already gone) and clears the cookie.
  - There is no token refresh/rotation — the cookie and DB row share the same fixed 7-day expiry set at login.
- **Database**: Single `PrismaClient` instance exported from `src/lib/db.ts`. Schema lives in `prisma/schema.prisma`.
- **Inbound email**: `POST /api/email/inbound` converts a support email into a `Ticket`. Provider-agnostic — accepts a JSON body of `{ from, subject, text|body }` (any inbound-email webhook provider such as Resend Inbound or SendGrid Inbound Parse can be pointed at it after mapping its payload to this shape). Protected by a shared secret rather than session auth: the `verifyEmailWebhook` middleware (`src/middleware/verifyEmailWebhook.ts`) requires the `X-Webhook-Secret` header to match `EMAIL_WEBHOOK_SECRET`; the route 500s if that env var is unset. Parsing lives in `src/lib/parseInboundEmail.ts` — `parseSender` extracts an email/name pair from a raw `From` header (`"Jane Doe <jane@example.com>"` or a bare address), and `parseInboundEmail` requires a sender and a non-empty body, defaulting a missing subject to `"(no subject)"`. The route does not set `status` or `category` explicitly — every email-created ticket gets the schema default `status: OPEN` and `category: null` (AI classification is a separate, not-yet-implemented step; the `Ticket` model and `TicketStatus`/`TicketCategory` enums themselves predate this route and are unchanged by it).

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
| `PATCH` | `/api/users/:id` | `requireAdmin` | Update `name`/`email`; updates `password` only if provided |
| `DELETE` | `/api/users/:id` | `requireAdmin` | Soft-deletes user (sets `deletedAt`, revokes sessions); 403 if target is `ADMIN` |
| `POST` | `/api/email/inbound` | `verifyEmailWebhook` | Converts an inbound support email into a `Ticket` |
| `GET` | `/api/health` | — | Returns `{ status: "ok" }` |

### Client (`client/`) — React 18 + Vite + TanStack Query

- Vite proxies all `/api` requests to `http://localhost:3000`, so the client uses relative paths (e.g. `api.get("/auth/me")`).
- All fetch calls go through `src/lib/api.ts`, which always sends `credentials: "include"` (required for the session cookie).
- Auth state lives in a `["me"]` query in `App.tsx`. Every protected route checks `user` from that query — no separate auth context or store.
- `App.tsx` also polls `/api/health` every 30 seconds and shows a status banner at the top of the page.
- Client-side types mirror the Prisma enums (`TicketStatus`, `TicketCategory`, `Role`). `src/types/ticket.ts` is the single reusable source for the ticket domain (`Ticket`, `TicketStatus`, `TicketCategory`, `Reply`, `TicketWithReplies`) — every ticket-related file imports from it directly rather than redeclaring shapes. `src/types/index.ts` holds the remaining non-ticket types (`User`, `Role`, `AssignableUser`).
- `src/lib/ticketQueries.ts` exports `invalidateTicketQueries(queryClient, id)`, a shared helper that invalidates both the `["ticket", id]` and `["tickets"]` TanStack Query caches. Used as the `onSuccess` handler by every ticket-mutating mutation in `TicketDetail.tsx` (status, category, assignment, reply) so list and detail views stay in sync without repeating the invalidation pair.
- `src/lib/ticketLabels.ts` exports the shared `STATUS_BADGE`, `STATUS_LABEL`, `CATEGORY_LABEL` display maps, used by both `TicketDetail.tsx` (dropdown option text) and `components/TicketDetailCard.tsx` (badges).
- `src/components/TicketDetailCard.tsx` renders a ticket's read-only basics — subject, status/category badges, sender, date, message body — from a plain `Ticket`, not `TicketWithReplies`, so it structurally cannot render the reply thread. Used by `TicketDetail.tsx`; the reply list and reply form stay separate, further down the page.
- `src/components/UpdateTicket.tsx` is the right column of `TicketDetail.tsx` — the Status, Category, and Assigned-to dropdowns. It owns the category/assignment mutations and the `/users/assignable` query itself; `statusMutation` is passed in as a prop from `TicketDetail.tsx` because the page's "Close ticket" button (in the reply form) also drives it.

#### Client routes

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login` | Redirects to `/dashboard` if already authed |
| `/dashboard` | `Dashboard` | Requires auth |
| `/tickets/:id` | `TicketDetail` | Requires auth |
| `/users` | `Users` | Requires auth + `ADMIN` role (non-admins redirected to `/dashboard`) |
| `*` | — | Redirects to `/dashboard` or `/login` |

### Data model

| Model | Key fields |
|---|---|
| `User` | `id` (cuid), `name`, `email` (unique), bcrypt `password`, `role: ADMIN \| AGENT`, `deletedAt?` (soft delete — excluded from `GET /api/users`, blocked from login, `ADMIN` role cannot be deleted) |
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
