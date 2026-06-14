import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { surveyRouter } from "./routes/surveys";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use(
	"*",
	cors({
		origin: (origin, c) => {
			const allowedOrigins = [
				c.env.FRONTEND_URL,
				"http://localhost:5173",
				"https://localhost:5173",
			];
			return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
		},
		credentials: true,
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	}),
);

app.use("*", logger());

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Routes
app.route("/api/auth", authRouter);
app.route("/api/surveys", surveyRouter);
app.route("/api/s", publicRouter);

// 404 fallback
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json({ error: "Internal server error" }, 500);
});

export default app;
