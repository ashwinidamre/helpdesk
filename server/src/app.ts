import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import authRoutes from "./routes/auth";
import ticketRoutes from "./routes/tickets";
import userRoutes from "./routes/users";
import emailRoutes from "./routes/email";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/users", userRoutes);
app.use("/api/email", emailRoutes);

// In production the client build is served from the same origin as the API
// (rather than a separate static host) so the session cookie, which is
// sameSite: "lax", is always first-party — see src/lib/session.ts.
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(import.meta.dir, "../../client/dist");
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

Sentry.setupExpressErrorHandler(app);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
