import { STATUS_BADGE, STATUS_LABEL, CATEGORY_LABEL } from "../lib/ticketLabels";
import AiSeal from "./AiSeal";
import type { Ticket } from "../types/ticket";

interface Props {
  ticket: Ticket;
}

export default function TicketDetailCard({ ticket }: Props) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-4">
        <span className="text-sm text-muted-foreground">
          From <span className="text-foreground">{ticket.senderName ?? ticket.senderEmail}</span>
          {ticket.senderName && <span> &lt;{ticket.senderEmail}&gt;</span>}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(ticket.createdAt).toLocaleString()}
        </span>
      </div>

      <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">{ticket.subject}</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ticket.status]}`}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
        {ticket.category && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {CATEGORY_LABEL[ticket.category]}
          </span>
        )}
        {ticket.resolvedByAi && <AiSeal />}
      </div>

      <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">
        {ticket.body}
      </p>
    </div>
  );
}
