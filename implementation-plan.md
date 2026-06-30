# Implementation Plan

## Phase 1 — Project Setup

- [ ] Initialize Next.js 15 project with TypeScript and App Router
- [ ] Install and configure Tailwind CSS
- [ ] Install and configure shadcn/ui
- [ ] Set up PostgreSQL database on Neon
- [ ] Install and configure Prisma, connect to Neon
- [ ] Define initial Prisma schema (users, sessions, tickets)
- [ ] Run first migration
- [ ] Set up environment variables (`.env.local`)
- [ ] Create base folder structure (`app/`, `lib/`, `components/`, `prisma/`)

---

## Phase 2 — Authentication

- [ ] Add `sessions` table to Prisma schema
- [ ] Build login page UI (`/login`)
- [ ] Implement login server action (validate credentials, create session in DB)
- [ ] Implement logout server action (delete session from DB)
- [ ] Write session helper (`lib/session.ts`) to read and validate session from cookie
- [ ] Add `middleware.ts` to protect routes and redirect unauthenticated users
- [ ] Add role check in middleware to restrict admin-only routes
- [ ] Seed database with initial admin user

---

## Phase 3 — Ticket Core

- [ ] Finalize tickets table schema (status, category, subject, body, sender email, timestamps)
- [ ] Build ticket list page (`/dashboard`) with a data table
- [ ] Add filtering by status (open / resolved / closed) and category
- [ ] Add sorting by date and status
- [ ] Build ticket detail page (`/tickets/[id]`)
- [ ] Display ticket metadata (sender, category, status, timestamps)
- [ ] Implement status update action (open → resolved → closed)
- [ ] Add manual category selector on ticket detail

---

## Phase 4 — Email Integration

- [ ] Set up Resend Inbound (or SendGrid Inbound Parse) webhook
- [ ] Build inbound email route handler (`POST /api/email/inbound`)
- [ ] Parse incoming email (sender, subject, body) and create a ticket in DB
- [ ] Install and configure Nodemailer for outbound email
- [ ] Build reply form on ticket detail page
- [ ] Implement send reply server action (send email via Nodemailer + save reply to DB)
- [ ] Update ticket status to resolved after reply is sent

---

## Phase 5 — AI Features

- [ ] Install Anthropic SDK
- [ ] Write AI helper (`lib/ai.ts`) with a shared Claude client
- [ ] Implement ticket classification (call Claude on ticket creation, auto-assign category)
- [ ] Implement AI summary (generate a one-paragraph summary of the ticket on the detail page)
- [ ] Implement suggested reply (generate a draft reply using the ticket body and knowledge base)
- [ ] Display AI summary and suggested reply on ticket detail page
- [ ] Allow agents to edit the suggested reply before sending

---

## Phase 6 — User Management

- [ ] Add agents list page (`/admin/agents`) — admin only
- [ ] Build create agent form (name, email, password)
- [ ] Implement create agent server action (hash password, insert user with role = agent)
- [ ] Add ability to deactivate an agent account
- [ ] Show agent assignment on tickets (who is handling it)

---

## Phase 7 — Dashboard

- [ ] Build dashboard overview with ticket stats (total, open, resolved, closed)
- [ ] Add breakdown by category
- [ ] Show list of recent tickets with status badges
- [ ] Add quick-filter links (e.g. "View all open tickets")

---

## Phase 8 — Deployment

- [ ] Connect GitHub repo to Vercel
- [ ] Set up Neon production database
- [ ] Add all environment variables to Vercel project settings
- [ ] Run Prisma migrations against production DB
- [ ] Deploy and smoke test all major flows
- [ ] Configure inbound email webhook to point to production URL
