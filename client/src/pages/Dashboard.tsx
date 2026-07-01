import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Ticket, TicketStatus, TicketCategory, User } from "../types";

const STATUS_BADGE: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL_QUESTION: "General",
  TECHNICAL_QUESTION: "Technical",
  REFUND_QUESTION: "Refund",
};

interface Props {
  user: User;
}

export default function Dashboard({ user }: Props) {
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets", status, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      return api.get<Ticket[]>(`/tickets?${params.toString()}`);
    },
  });

  async function handleLogout() {
    await api.post("/auth/logout", {});
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
    queryClient.setQueryData(["me"], null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Helpdesk</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.name}</span>
            {user.role === "ADMIN" && (
              <Link
                to="/admin/agents"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Agents
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus | "")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory | "")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All categories</option>
            <option value="GENERAL_QUESTION">General</option>
            <option value="TECHNICAL_QUESTION">Technical</option>
            <option value="REFUND_QUESTION">Refund</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-400">No tickets found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.senderEmail}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.category ? CATEGORY_LABEL[t.category] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}
                      >
                        {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
