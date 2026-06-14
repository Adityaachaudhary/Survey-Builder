import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types";

type AuthEnv = {
	Bindings: Env;
	Variables: { userId: string };
};

export async function requireAuth(c: Context<AuthEnv>, next: Next): Promise<Response | undefined> {
	const sessionToken = getCookie(c, "session");

	if (!sessionToken) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const userId = await c.env.SESSIONS.get(`session:${sessionToken}`);

	if (!userId) {
		return c.json({ error: "Session expired" }, 401);
	}

	c.set("userId", userId);
	await next();
	return undefined;
}
