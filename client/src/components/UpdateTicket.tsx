import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { api } from "../lib/api";
import { invalidateTicketQueries } from "../lib/ticketQueries";
import { STATUS_LABEL, CATEGORY_LABEL } from "../lib/ticketLabels";
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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Details
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-gray-500">
              Status
            </label>
            <select
              id="status"
              value={ticket.status}
              onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
              disabled={statusMutation.isPending}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none disabled:opacity-50"
            >
              {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {statusMutation.isError && (
              <p className="mt-1 text-xs text-red-600">
                {statusMutation.error instanceof Error
                  ? statusMutation.error.message
                  : "Failed to update status"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-xs font-medium text-gray-500">
              Category
            </label>
            <select
              id="category"
              value={ticket.category ?? ""}
              onChange={(e) =>
                categoryMutation.mutate((e.target.value || null) as TicketCategory | null)
              }
              disabled={categoryMutation.isPending}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none disabled:opacity-50"
            >
              <option value="">Uncategorized</option>
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            {categoryMutation.isError && (
              <p className="mt-1 text-xs text-red-600">
                {categoryMutation.error instanceof Error
                  ? categoryMutation.error.message
                  : "Failed to update category"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="assignedTo" className="mb-1 block text-xs font-medium text-gray-500">
              Assigned to
            </label>
            <select
              id="assignedTo"
              value={ticket.assignedTo?.id ?? ""}
              onChange={(e) => assignMutation.mutate(e.target.value || null)}
              disabled={assignMutation.isPending}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {assignMutation.isError && (
              <p className="mt-1 text-xs text-red-600">
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
