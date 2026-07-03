import type { TicketCategory, TicketStatus } from "../types/ticket";

export const STATUS_BADGE: Record<TicketStatus, string> = {
  NEW: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  OPEN: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
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
