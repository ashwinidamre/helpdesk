import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { TicketStatus, TicketWithReplies, User } from "../types";

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
  const [replyBody, setReplyBody] = useState("");

  const { data: ticket, isLoading } = useQuery<TicketWithReplies>({
    queryKey: ["ticket", id],
    queryFn: () => api.get<TicketWithReplies>(`/tickets/${id}`),
  });

  const replyMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/reply`, { body }),
    onSuccess: () => {
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

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
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Send a reply
            </h2>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={5}
              placeholder="Write your reply..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => replyMutation.mutate(replyBody)}
                disabled={!replyBody.trim() || replyMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {replyMutation.isPending ? "Sending..." : "Send reply"}
              </button>
              <button
                onClick={() => statusMutation.mutate("CLOSED")}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Close ticket
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
