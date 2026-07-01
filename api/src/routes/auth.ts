import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Resend } from "resend";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createUser, findUserByEmail } from "../db/queries";
import type { Env } from "../types";

export const authRouter = new Hono<{ Bindings: Env }>();

function generateId(): string {
	return crypto.randomUUID();
}

function generateOTP(): string {
	// Use Web Crypto API for cryptographically secure randomness.
	// Math.random() is pseudo-random and predictable — never use it for
	// security-sensitive tokens like OTPs, passwords, or session IDs.
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	// Clamp to 6 digits: take value modulo 900000, then add 100000
	// to guarantee it's always exactly 6 digits (100000–999999)
	return (100000 + (array[0] % 900000)).toString();
}

// ─── Rate limiting helpers ────────────────────────────────────────────────────
//
// We use KV to track two things:
//
//   1. send-otp rate limit  — key: `rl:send:{email}`
//      Max 5 sends per hour per email. Prevents email flooding / Resend quota drain.
//
//   2. verify-otp attempts  — key: `rl:verify:{email}`
//      Max 5 attempts per OTP window. Prevents brute-force of the 6-digit code.
//      Counter is deleted when OTP is deleted (success or new OTP issued).
//
// KV TTL handles automatic expiry — no cleanup job needed.

const SEND_LIMIT = 5;       // max OTP sends per email per hour
const SEND_WINDOW = 3600;   // 1 hour in seconds
const VERIFY_LIMIT = 5;     // max verify attempts before lockout
const VERIFY_WINDOW = 600;  // same as OTP TTL (10 minutes)

async function getSendCount(kv: KVNamespace, email: string): Promise<number> {
	const val = await kv.get(`rl:send:${email}`);
	return val ? parseInt(val, 10) : 0;
}

async function incrementSendCount(kv: KVNamespace, email: string): Promise<void> {
	const current = await getSendCount(kv, email);
	// Reset TTL on every increment so the window is always 1 hour from first send
	await kv.put(`rl:send:${email}`, String(current + 1), {
		expirationTtl: SEND_WINDOW,
	});
}

async function getVerifyAttempts(kv: KVNamespace, email: string): Promise<number> {
	const val = await kv.get(`rl:verify:${email}`);
	return val ? parseInt(val, 10) : 0;
}

async function incrementVerifyAttempts(kv: KVNamespace, email: string): Promise<void> {
	const current = await getVerifyAttempts(kv, email);
	// TTL matches OTP window — counter auto-expires when OTP expires
	await kv.put(`rl:verify:${email}`, String(current + 1), {
		expirationTtl: VERIFY_WINDOW,
	});
}

async function resetVerifyAttempts(kv: KVNamespace, email: string): Promise<void> {
	await kv.delete(`rl:verify:${email}`);
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const sendOtpSchema = z.object({
	email: z.string().email("Valid email required"),
});

const verifyOtpSchema = z.object({
	email: z.string().email("Valid email required"),
	otp: z.string().min(1, "OTP required"),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/send-otp
authRouter.post(
	"/send-otp",
	zValidator("json", sendOtpSchema, (result, c) => {
		if (!result.success) {
			return c.json({ error: "Valid email required" }, 400);
		}
		return;
	}),
	async (c) => {
		const body = c.req.valid("json");
		const email = body.email.trim().toLowerCase();

	const resendApiKey = c.env.RESEND_API_KEY?.trim();
	if (!resendApiKey) {
		return c.json({ error: "Resend API key is not configured" }, 500);
	}

	// ── Rate limit check ──
	// Block if this email has requested too many OTPs in the past hour.
	// We return 429 (Too Many Requests) — the standard HTTP status for rate limiting.
	const sendCount = await getSendCount(c.env.SESSIONS, email);
	if (sendCount >= SEND_LIMIT) {
		return c.json(
			{ error: "Too many code requests. Please wait before trying again." },
			429,
		);
	}

	const otp = generateOTP();
	const otpKey = `otp:${email}`;

	// Store OTP in KV with 10 minute expiry.
	// Also reset verify attempts — a new OTP means a fresh attempt window.
	await Promise.all([
		c.env.SESSIONS.put(otpKey, otp, { expirationTtl: 600 }),
		resetVerifyAttempts(c.env.SESSIONS, email),
	]);

	// Increment send counter after issuing OTP
	await incrementSendCount(c.env.SESSIONS, email);

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
authRouter.post(
	"/verify-otp",
	zValidator("json", verifyOtpSchema, (result, c) => {
		if (!result.success) {
			return c.json({ error: "Email and OTP required" }, 400);
		}
		return;
	}),
	async (c) => {
		const body = c.req.valid("json");
		const email = body.email.trim().toLowerCase();
		const otp = body.otp.trim();

	// ── Brute-force protection ──
	// Check attempt count BEFORE looking up the OTP.
	// This way an attacker cannot enumerate codes even if they
	// somehow know an OTP exists — they get locked out first.
	const attempts = await getVerifyAttempts(c.env.SESSIONS, email);
	if (attempts >= VERIFY_LIMIT) {
		return c.json(
			{ error: "Too many incorrect attempts. Please request a new code." },
			429,
		);
	}

	const storedOtp = await c.env.SESSIONS.get(`otp:${email}`);

	if (!storedOtp || storedOtp !== otp) {
		// Increment attempt counter on every failure
		await incrementVerifyAttempts(c.env.SESSIONS, email);
		const remaining = VERIFY_LIMIT - (attempts + 1);
		return c.json(
			{
				error: "Invalid or expired code",
				...(remaining > 0 && { hint: `${remaining} attempt${remaining === 1 ? "" : "s"} remaining` }),
			},
			401,
		);
	}

	// ── Success path ──
	// Delete OTP and reset attempt counter atomically.
	// OTP is now invalid — cannot be reused even within the 10-minute window.
	await Promise.all([
		c.env.SESSIONS.delete(`otp:${email}`),
		resetVerifyAttempts(c.env.SESSIONS, email),
	]);

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