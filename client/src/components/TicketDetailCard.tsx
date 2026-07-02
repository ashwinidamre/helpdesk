import { STATUS_BADGE, STATUS_LABEL, CATEGORY_LABEL } from "../lib/ticketLabels";
import type { Ticket } from "../types/ticket";

interface Props {
  ticket: Ticket;
}

export default function TicketDetailCard({ ticket }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{ticket.subject}</h2>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ticket.status]}`}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
        {ticket.category && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {CATEGORY_LABEL[ticket.category]}
          </span>
        )}
        <span className="text-xs text-gray-400">
          From {ticket.senderEmail} &middot; {new Date(ticket.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-700">{ticket.body}</p>
    </div>
  );
}
