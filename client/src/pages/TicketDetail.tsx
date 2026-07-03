import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { invalidateTicketQueries } from "../lib/ticketQueries";
import TicketDetailCard from "../components/TicketDetailCard";
import ReplyThread from "../components/ReplyThread";
import UpdateTicket from "../components/UpdateTicket";
import Skeleton from "../components/Skeleton";
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
    getValues,
    setValue,
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

  const polishMutation = useMutation({
    mutationFn: (body: string) =>
      api.post<{ body: string }>(`/tickets/${id}/polish-reply`, { body }),
    onSuccess: (data) => setValue("body", data.body),
  });

  function onPolishClick() {
    const body = getValues("body").trim();
    if (!body) return;
    polishMutation.mutate(body);
  }

  const summarizeMutation = useMutation({
    mutationFn: () => api.post<{ aiSummary: string }>(`/tickets/${id}/summarize`, {}),
    onSuccess: () => invalidateTicketQueries(queryClient, id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => invalidateTicketQueries(queryClient, id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" role="status" aria-label="Loading ticket">
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-64" />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-6 shadow-card">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-72" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
            <Skeleton className="h-64 rounded-[var(--radius)]" />
          </div>
        </main>
      </div>
    );
  }
  if (!ticket) {
    return <div className="p-8 text-sm text-muted-foreground">Ticket not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background animate-fade-up motion-reduce:animate-none">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 px-6 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            &larr; Back
          </Link>
          <h1 className="truncate font-serif text-base font-semibold text-foreground">
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
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => summarizeMutation.mutate()}
                disabled={summarizeMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-brass/40 px-3 py-1.5 text-sm font-medium text-brass transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {summarizeMutation.isPending ? "Summarizing..." : "Summarize"}
              </button>

              {summarizeMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to summarize ticket. Please try again.
                </p>
              )}

              {ticket.aiSummary && (
                <div className="animate-fade-up rounded-[var(--radius)] border border-brass/30 bg-accent p-4 shadow-seal motion-reduce:animate-none">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brass">
                    AI Summary
                  </p>
                  <p className="text-sm text-accent-foreground">{ticket.aiSummary}</p>
                </div>
              )}
            </div>

            {/* Replies */}
            <ReplyThread replies={ticket.replies} />

            {/* Reply form */}
            {ticket.status !== "CLOSED" && (
              <form
                onSubmit={handleSubmit(onReplySubmit)}
                noValidate
                className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-card"
              >
                <h2 className="mb-3 text-sm font-medium text-foreground">
                  Send a reply
                </h2>
                <textarea
                  {...register("body")}
                  rows={5}
                  placeholder="Write your reply..."
                  className={`w-full rounded-md border bg-background px-3 py-2 font-serif text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 ${
                    errors.body ? "border-destructive" : "border-input focus:border-ring"
                  }`}
                />
                {errors.body && (
                  <p className="mt-1 text-sm text-destructive">{errors.body.message}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onPolishClick}
                    disabled={polishMutation.isPending}
                    className="rounded-md border border-brass/40 px-4 py-2 text-sm font-medium text-brass transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {polishMutation.isPending ? "Polishing..." : "Polish"}
                  </button>
                  <button
                    type="submit"
                    disabled={replyMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow-md motion-safe:active:scale-[0.98] disabled:opacity-50"
                  >
                    {replyMutation.isPending ? "Sending..." : "Send reply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate("CLOSED")}
                    disabled={statusMutation.isPending}
                    className="rounded-md border border-input px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
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
