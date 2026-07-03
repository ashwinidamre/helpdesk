import type { TicketCategory, TicketStatus } from "../types/ticket";

export const STATUS_BADGE: Record<TicketStatus, string> = {
  NEW: "bg-wine/10 text-wine",
  PROCESSING: "bg-brass/10 text-brass",
  OPEN: "bg-forest/10 text-forest",
  RESOLVED: "bg-forest-light/10 text-forest-light",
  CLOSED: "bg-ink/5 text-ash",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  OPEN: "Open",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Statuses an agent can manually set via the ticket detail dropdown.
// NEW and PROCESSING are automation-only states driven by the AI auto-resolve pipeline.
export const MANUAL_TICKET_STATUSES: TicketStatus[] = ["OPEN", "RESOLVED", "CLOSED"];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL_QUESTION: "General",
  TECHNICAL_QUESTION: "Technical",
  REFUND_QUESTION: "Refund",
};
