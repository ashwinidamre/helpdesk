import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { api } from "../lib/api";
import { invalidateTicketQueries } from "../lib/ticketQueries";
import { STATUS_LABEL, CATEGORY_LABEL, MANUAL_TICKET_STATUSES } from "../lib/ticketLabels";
import type { AssignableUser } from "../types";
import type { Ticket, TicketCategory, TicketStatus } from "../types/ticket";

interface Props {
  ticket: Ticket;
  statusMutation: UseMutationResult<unknown, Error, TicketStatus, unknown>;
}

export default function UpdateTicket({ ticket, statusMutation }: Props) {
  const queryClient = useQueryClient();

  const { data: assignableUsers = [] } = useQuery<AssignableUser[]>({
    queryKey: ["assignable-users"],
    queryFn: () => api.get<AssignableUser[]>("/users/assignable"),
  });

  const categoryMutation = useMutation({
    mutationFn: (category: TicketCategory | null) =>
      api.patch(`/tickets/${ticket.id}`, { category }),
    onSuccess: () => invalidateTicketQueries(queryClient, ticket.id),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      api.patch(`/tickets/${ticket.id}`, { assignedToId }),
    onSuccess: () => invalidateTicketQueries(queryClient, ticket.id),
  });

  const selectClass =
    "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Details
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              value={ticket.status}
              onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
              disabled={statusMutation.isPending}
              className={selectClass}
            >
              {!MANUAL_TICKET_STATUSES.includes(ticket.status) && (
                <option value={ticket.status} disabled>
                  {STATUS_LABEL[ticket.status]}
                </option>
              )}
              {MANUAL_TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {statusMutation.isError && (
              <p className="mt-1 text-xs text-destructive">
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : "Failed to update status"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              id="category"
              value={ticket.category ?? ""}
              onChange={(e) =>
                categoryMutation.mutate((e.target.value || null) as TicketCategory | null)
              }
              disabled={categoryMutation.isPending}
              className={selectClass}
            >
              <option value="">Uncategorized</option>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            {categoryMutation.isError && (
              <p className="mt-1 text-xs text-destructive">
                {categoryMutation.error instanceof Error
                  ? categoryMutation.error.message
                  : "Failed to update category"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="assignedTo" className="mb-1 block text-xs font-medium text-muted-foreground">
              Assigned to
            </label>
            <select
              id="assignedTo"
              value={ticket.assignedTo?.id ?? ""}
              onChange={(e) => assignMutation.mutate(e.target.value || null)}
              disabled={assignMutation.isPending}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {assignMutation.isError && (
              <p className="mt-1 text-xs text-destructive">
                {assignMutation.error instanceof Error
                  ? assignMutation.error.message
                  : "Failed to assign ticket"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
