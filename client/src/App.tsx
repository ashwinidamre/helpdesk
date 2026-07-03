import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import Users from "./pages/Users";
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
      <div className="flex h-screen items-center justify-center bg-background font-serif text-muted-foreground">
        Loading...
      </div>
    );
  }

  const serverOk = health?.status === "ok";

  return (
    <>
      <div
        className={`px-4 py-1.5 text-center text-xs font-medium transition-colors duration-300 ${
          health === undefined
            ? "bg-brass/10 text-brass"
            : serverOk
            ? "bg-forest/10 text-forest"
            : "bg-destructive/10 text-destructive"
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
          path="/users"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.role === "ADMIN" ? (
              <Users user={user} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
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
