import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import type { User } from "./types";

export default function App() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me"),
  });

  const { data: health } = useQuery<{ status: string }>({
    queryKey: ["health"],
    queryFn: () => api.get("/health"),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  const serverOk = health?.status === "ok";

  return (
    <>
      <div
        className={`px-4 py-1.5 text-center text-xs font-medium ${
          health === undefined
            ? "bg-yellow-50 text-yellow-700"
            : serverOk
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}
      >
        {health === undefined
          ? "Checking server status..."
          : serverOk
          ? "Server is online"
          : "Server is offline"}
      </div>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/tickets/:id"
          element={user ? <TicketDetail user={user} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
    </>
  );
}
