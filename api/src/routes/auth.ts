import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Resend } from "resend";
import { createUser, findUserByEmail } from "../db/queries";
import type { Env } from "../types";

export const authRouter = new Hono<{ Bindings: Env }>();

function generateId(): string {
	return crypto.randomUUID();
}

function generateOTP(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/send-otp
authRouter.post("/send-otp", async (c) => {
	const body = await c.req.json<{ email: string }>();
	const email = body.email?.trim().toLowerCase();

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return c.json({ error: "Valid email required" }, 400);
	}

	const resendApiKey = c.env.RESEND_API_KEY?.trim();
	if (!resendApiKey) {
		return c.json({ error: "Resend API key is not configured" }, 500);
	}

	const otp = generateOTP();
	const otpKey = `otp:${email}`;

	// Store OTP in KV with 10 minute expiry
	await c.env.SESSIONS.put(otpKey, otp, { expirationTtl: 600 });

	const resend = new Resend(resendApiKey);

	try {
		await resend.emails.send({
			from: "Survey Builder <onboarding@resend.dev>",
			to: email,
			subject: "Your sign-in code",
			html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #111; margin-bottom: 8px;">Your sign-in code</h2>
          <p style="color: #555; margin-bottom: 24px;">Enter this code to sign in to Survey Builder. It expires in 10 minutes.</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
		});
	} catch (err) {
		console.error("Resend error:", err);
		return c.json({ error: "Failed to send email. Check RESEND_API_KEY." }, 500);
	}

	return c.json({ success: true, message: "OTP sent" });
});

// POST /api/auth/verify-otp
authRouter.post("/verify-otp", async (c) => {
	const body = await c.req.json<{ email: string; otp: string }>();
	const email = body.email?.trim().toLowerCase();
	const otp = body.otp?.trim();

	if (!email || !otp) {
		return c.json({ error: "Email and OTP required" }, 400);
	}

	const storedOtp = await c.env.SESSIONS.get(`otp:${email}`);

	if (!storedOtp || storedOtp !== otp) {
		return c.json({ error: "Invalid or expired code" }, 401);
	}

	// Invalidate OTP
	await c.env.SESSIONS.delete(`otp:${email}`);

	// Find or create user
	let user = await findUserByEmail(c.env.DB, email);
	if (!user) {
		user = await createUser(c.env.DB, generateId(), email);
	}

	// Create session (30 days)
	const sessionToken = generateId();
	await c.env.SESSIONS.put(`session:${sessionToken}`, user.id, {
		expirationTtl: 60 * 60 * 24 * 30,
	});

	setCookie(c, "session", sessionToken, {
		httpOnly: true,
		secure: true,
		sameSite: "None",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
	});

	return c.json({ success: true, user: { id: user.id, email: user.email } });
});

// GET /api/auth/me
authRouter.get("/me", async (c) => {
	const sessionToken = getCookie(c, "session");
	if (!sessionToken) {
		return c.json({ user: null });
	}

	const userId = await c.env.SESSIONS.get(`session:${sessionToken}`);
	if (!userId) {
		return c.json({ user: null });
	}

	const { findUserById } = await import("../db/queries");
	const user = await findUserById(c.env.DB, userId);

	if (!user) {
		return c.json({ user: null });
	}

	return c.json({ user: { id: user.id, email: user.email } });
});

// POST /api/auth/logout
authRouter.post("/logout", async (c) => {
	const sessionToken = getCookie(c, "session");
	if (sessionToken) {
		await c.env.SESSIONS.delete(`session:${sessionToken}`);
	}

	deleteCookie(c, "session", { path: "/" });
	return c.json({ success: true });
});
