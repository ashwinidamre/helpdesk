import { describe, test, expect, mock, beforeEach } from "bun:test";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TicketWithReplies } from "../types/ticket";
import type { User } from "../types";

const mockApi = {
  get: mock(),
  post: mock(),
  patch: mock(),
  delete: mock(),
};

mock.module("../lib/api", () => ({ api: mockApi }));

const { default: TicketDetail } = await import("./TicketDetail");

const adminUser: User = { id: "u1", name: "Admin", email: "admin@helpdesk.com", role: "ADMIN" };

const baseTicket: TicketWithReplies = {
  id: "t1",
  subject: "Cannot log in",
  body: "I can't log into my account",
  senderEmail: "student@example.com",
  senderName: null,
  status: "OPEN",
  category: null,
  aiSummary: null,
  assignedTo: null,
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
  replies: [],
};

function mockGetHandlers(ticket: TicketWithReplies | null) {
  mockApi.get.mockImplementation((path: string) => {
    if (path === "/tickets/t1") return Promise.resolve(ticket);
    if (path === "/users/assignable") return Promise.resolve([]);
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tickets/t1"]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail user={adminUser} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TicketDetail", () => {
  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.patch.mockReset();
  });

  test("shows a loading state before the ticket query resolves", () => {
    mockGetHandlers(baseTicket);
    renderPage();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("renders the ticket's basic details once loaded", async () => {
    mockGetHandlers(baseTicket);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("I can't log into my account")).toBeInTheDocument();
    });
    expect(screen.getByText(/student@example\.com/)).toBeInTheDocument();
  });

  test("shows 'Ticket not found.' when the ticket query resolves to nothing", async () => {
    mockGetHandlers(null);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Ticket not found.")).toBeInTheDocument();
    });
  });

  test("renders the reply thread below the message when replies exist", async () => {
    mockGetHandlers({
      ...baseTicket,
      replies: [
        { id: "r1", body: "Please try resetting your password", ticketId: "t1", createdAt: "2026-07-01T12:00:00.000Z" },
      ],
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Please try resetting your password")).toBeInTheDocument();
    });
    expect(screen.getByText("Replies")).toBeInTheDocument();
  });

  test("submits the reply form with the typed body", async () => {
    mockGetHandlers(baseTicket);
    mockApi.post.mockResolvedValue({
      id: "r1",
      body: "Thanks for reaching out",
      ticketId: "t1",
      createdAt: "2026-07-01T13:00:00.000Z",
    });
    renderPage();

    const textarea = await screen.findByPlaceholderText("Write your reply...");
    fireEvent.change(textarea, { target: { value: "Thanks for reaching out" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/tickets/t1/reply", {
        body: "Thanks for reaching out",
      });
    });
  });

  test("rejects submitting an empty reply without calling the API", async () => {
    mockGetHandlers(baseTicket);
    renderPage();

    await screen.findByPlaceholderText("Write your reply...");
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument();
    });
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  test("does not render the reply form once the ticket is closed", async () => {
    mockGetHandlers({ ...baseTicket, status: "CLOSED" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("I can't log into my account")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Write your reply...")).not.toBeInTheDocument();
  });

  test("'Close ticket' button patches the ticket status to CLOSED", async () => {
    mockGetHandlers(baseTicket);
    mockApi.patch.mockResolvedValue({ ...baseTicket, status: "CLOSED" });
    renderPage();

    const closeButton = await screen.findByRole("button", { name: "Close ticket" });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith("/tickets/t1", { status: "CLOSED" });
    });
  });
});
