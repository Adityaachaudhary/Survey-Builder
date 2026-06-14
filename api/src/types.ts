export interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	RESEND_API_KEY: string;
	FRONTEND_URL: string;
	ENVIRONMENT?: string;
}
