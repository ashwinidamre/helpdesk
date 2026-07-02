import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { invalidateTicketQueries } from "../lib/ticketQueries";
import TicketDetailCard from "../components/TicketDetailCard";
import ReplyThread from "../components/ReplyThread";
import UpdateTicket from "../components/UpdateTicket";
import type { User } from "../types";
import type { TicketStatus, TicketWithReplies } from "../types/ticket";

const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty"),
});

type ReplyFormValues = z.infer<typeof replySchema>;

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

  const replyMutation = useMutation({
    mutationFn: (body: string) => api.post(`/tickets/${id}/reply`, { body }),
    onSuccess: () => {
      reset();
      invalidateTicketQueries(queryClient, id);
    },
  });

  function onReplySubmit(data: ReplyFormValues) {
    replyMutation.mutate(data.body);
  }

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => invalidateTicketQueries(queryClient, id),
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
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            &larr; Back
          </Link>
          <h1 className="truncate text-base font-semibold text-gray-900">
            {ticket.subject}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 md:col-span-2">
            {/* Ticket body */}
            <TicketDetailCard ticket={ticket} />

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
            <ReplyThread replies={ticket.replies} />

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
          </div>

          {/* Right column */}
          <UpdateTicket ticket={ticket} statusMutation={statusMutation} />
        </div>
      </main>
    </div>
  );
}
