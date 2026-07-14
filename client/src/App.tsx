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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-serif text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
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
  );
}
