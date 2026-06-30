# Tech Stack

## Framework
- **Next.js 15 (App Router)** — full-stack React framework; handles UI and API routes in one repo

## Database
- **PostgreSQL** — relational database for tickets, users, sessions, and knowledge base
- **Prisma** — ORM for type-safe queries and schema migrations

## Authentication
- **Database sessions** — sessions stored in a `sessions` table in PostgreSQL; no JWTs

## AI
- **Claude API (`claude-sonnet-4-6`)** — ticket classification, summaries, and suggested replies

## Email
- **Nodemailer** — sending replies to students
- **Resend Inbound (or SendGrid Inbound Parse)** — receiving student emails via webhook to create tickets

## Styling
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — pre-built accessible components (tables, dialogs, badges, forms)

## Frontend
- **Next.js 15 (App Router)** — React framework with file-based routing
- **React 19** — UI library
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — pre-built accessible components (tables, badges, dialogs, forms)
- **React Hook Form** — form state management
- **Zod** — schema validation for forms and API inputs

## Backend
- **Next.js Route Handlers** — API endpoints (runs on Node.js)
- **Prisma** — ORM for PostgreSQL; type-safe queries and migrations
- **PostgreSQL** — primary database
- **Nodemailer** — sending email replies to students
- **Resend Inbound** — receiving inbound emails via webhook

## Deployment
- **Vercel** — hosting for the Next.js app
- **Neon** — managed serverless PostgreSQL (integrates directly with Vercel)
