import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AssignableUser, TicketStatus, TicketWithReplies, User } from "../types";

const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty"),
});

type ReplyFormValues = z.infer<typeof replySchema>;

const STATUS_BADGE: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

interface Props {
  user: User;
}

export default function TicketDetail({ user: _user }: Props) {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: "" },
  });

  const { data: ticket, isLoading } = useQuery<TicketWithReplies>({
    queryKey: ["ticket", id],
    queryFn: () => api.get<TicketWithReplies>(`/tickets/${id}`),
  });

  const { data: assignableUsers = [] } = useQuery<AssignableUser[]>({
    queryKey: ["assignable-users"],
    queryFn: () => api.get<AssignableUser[]>("/users/assignable"),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      api.patch(`/tickets/${id}`, { assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/reply`, { body }),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  function onReplySubmit(data: ReplyFormValues) {
    replyMutation.mutate(data.body);
  }

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }
  if (!ticket) {
    return <div className="p-8 text-sm text-gray-400">Ticket not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="truncate text-base font-semibold text-gray-900">
            {ticket.subject}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Ticket body */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ticket.status]}`}
            >
              {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
            </span>
            {ticket.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {ticket.category.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
            <span className="text-xs text-gray-400">
              From {ticket.senderEmail} &middot;{" "}
              {new Date(ticket.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{ticket.body}</p>
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
            <label htmlFor="assignedTo" className="text-xs font-medium text-gray-500">
              Assigned to
            </label>
            <select
              id="assignedTo"
              value={ticket.assignedTo?.id ?? ""}
              onChange={(e) => assignMutation.mutate(e.target.value || null)}
              disabled={assignMutation.isPending}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {assignMutation.isError && (
              <span className="text-xs text-red-600">
                {assignMutation.error instanceof Error
                  ? assignMutation.error.message
                  : "Failed to assign ticket"}
              </span>
            )}
          </div>
        </div>

        {/* AI summary */}
        {ticket.aiSummary && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-500">
              AI Summary
            </p>
            <p className="text-sm text-blue-900">{ticket.aiSummary}</p>
          </div>
        )}

        {/* Replies */}
        {ticket.replies.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Replies
            </h2>
            {ticket.replies.map((reply) => (
              <div
                key={reply.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {reply.body}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(reply.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Reply form */}
        {ticket.status !== "CLOSED" && (
          <form
            onSubmit={handleSubmit(onReplySubmit)}
            noValidate
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Send a reply
            </h2>
            <textarea
              {...register("body")}
              rows={5}
              placeholder="Write your reply..."
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                errors.body
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
            />
            {errors.body && (
              <p className="mt-1 text-sm text-red-600">{errors.body.message}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={replyMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {replyMutation.isPending ? "Sending..." : "Send reply"}
              </button>
              <button
                type="button"
                onClick={() => statusMutation.mutate("CLOSED")}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Close ticket
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
