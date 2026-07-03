import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Inbox } from "lucide-react";
import { api } from "../lib/api";
import { STATUS_BADGE, STATUS_LABEL, CATEGORY_LABEL } from "../lib/ticketLabels";
import AiSeal from "../components/AiSeal";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import TicketsPerDayChart from "../components/TicketsPerDayChart";
import type { User } from "../types";
import type { Ticket, TicketStatus, TicketCategory } from "../types/ticket";

const PAGE_SIZE = 10;

interface Props {
  user: User;
}

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  resolvedByAiPercent: number;
  avgResolutionTimeMs: number | null;
}

interface DailyCount {
  date: string;
  count: number;
}

type StatusFilter = TicketStatus | "AI_RESOLVED" | "";

function formatDuration(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function snippet(body: string, max = 88): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const fieldClass =
  "rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

export default function Dashboard({ user }: Props) {
  const [status, setStatus] = useState<StatusFilter>("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: stats } = useQuery<TicketStats>({
    queryKey: ["ticket-stats"],
    queryFn: () => api.get<TicketStats>("/tickets/stats"),
  });

  const { data: dailyCounts = [] } = useQuery<DailyCount[]>({
    queryKey: ["ticket-stats-daily"],
    queryFn: () => api.get<DailyCount[]>("/tickets/stats/daily"),
  });

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets", status, category, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status === "AI_RESOLVED") {
        params.set("resolvedByAi", "true");
      } else if (status) {
        params.set("status", status);
      }
      if (category) params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api.get<Ticket[]>(`/tickets?${params.toString()}`);
    },
  });

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = tickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleStatusChange(value: StatusFilter) {
    setStatus(value);
    setPage(1);
  }

  function handleCategoryChange(value: TicketCategory | "") {
    setCategory(value);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleLogout() {
    await api.post("/auth/logout", {});
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    queryClient.setQueryData(["me"], null);
  }

  const statTileClass =
    "rounded-[var(--radius)] border border-border bg-card p-4 shadow-card transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-card-hover";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 px-6 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/dashboard" className="font-serif text-lg font-semibold text-foreground">
            Helpdesk
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            {user.role === "ADMIN" && (
              <Link
                to="/users"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Users
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={statTileClass}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total tickets</p>
            {stats ? (
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                {stats.totalTickets.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-14" />
            )}
          </div>
          <div className={statTileClass}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Open tickets</p>
            {stats ? (
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                {stats.openTickets.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-14" />
            )}
          </div>
          <div className={statTileClass}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved by AI</p>
            {stats ? (
              <p className="mt-1 font-serif text-2xl font-semibold text-brass">
                {stats.resolvedByAiPercent.toFixed(1)}%
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-14" />
            )}
          </div>
          <div className={statTileClass}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg. resolution time</p>
            {stats ? (
              <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
                {stats.avgResolutionTimeMs != null ? formatDuration(stats.avgResolutionTimeMs) : "—"}
              </p>
            ) : (
              <Skeleton className="mt-2 h-7 w-14" />
            )}
          </div>
        </div>

        <div className="mb-6">
          <TicketsPerDayChart data={dailyCounts} />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tickets..."
            className={`w-64 ${fieldClass}`}
          />
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
            className={fieldClass}
          >
            <option value="">All statuses</option>
            <option value="NEW">New</option>
            <option value="PROCESSING">Processing</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="AI_RESOLVED">Resolved by AI</option>
          </select>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value as TicketCategory | "")}
            className={fieldClass}
          >
            <option value="">All categories</option>
            <option value="GENERAL_QUESTION">General</option>
            <option value="TECHNICAL_QUESTION">Technical</option>
            <option value="REFUND_QUESTION">Refund</option>
          </select>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-start gap-4 px-4 py-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-80" />
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                </li>
              ))}
            </ul>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tickets found"
            description="Nothing matches these filters. Try widening your search or clearing a filter."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {paginatedTickets.map((t, i) => (
                <li
                  key={t.id}
                  className="animate-fade-up motion-reduce:animate-none"
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  <Link
                    to={`/tickets/${t.id}`}
                    className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-secondary/60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-xs text-muted-foreground">
                          {t.senderEmail}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate font-serif text-base font-semibold text-foreground">
                        {t.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {snippet(t.body)}
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}
                        >
                          {STATUS_LABEL[t.status]}
                        </span>
                        {t.resolvedByAi && <AiSeal label={false} />}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.category ? CATEGORY_LABEL[t.category] : "Uncategorized"}
                        {t.assignedTo ? ` · ${t.assignedTo.name}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages} ({tickets.length} tickets)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-secondary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
