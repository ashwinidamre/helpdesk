export type TicketStatus = "NEW" | "PROCESSING" | "OPEN" | "RESOLVED" | "CLOSED";
export type TicketCategory =
  | "GENERAL_QUESTION"
  | "TECHNICAL_QUESTION"
  | "REFUND_QUESTION";

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  senderEmail: string;
  senderName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  aiSummary: string | null;
  resolvedByAi: boolean;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id: string;
  body: string;
  ticketId: string;
  createdAt: string;
}

export interface TicketWithReplies extends Ticket {
  replies: Reply[];
}
