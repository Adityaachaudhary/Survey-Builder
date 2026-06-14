import { Hono } from "hono";
import {
	createQuestion,
	createSurvey,
	deleteQuestion,
	deleteSurvey,
	getQuestionsBySurveyId,
	getResponseCountBySurveyId,
	getSurveyById,
	getSurveysByUserId,
	reorderQuestions,
	updateQuestion,
	updateSurvey,
} from "../db/queries";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

export const surveyRouter = new Hono<{
	Bindings: Env;
	Variables: { userId: string };
}>();

function generateId(): string {
	return crypto.randomUUID();
}

function generateSlug(title: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, "-")
		.slice(0, 40);
	const suffix = Math.random().toString(36).slice(2, 7);
	return `${base}-${suffix}`;
}

// Apply auth to all routes
surveyRouter.use("*", requireAuth);

// GET /api/surveys
surveyRouter.get("/", async (c) => {
	const userId = c.get("userId");
	const surveys = await getSurveysByUserId(c.env.DB, userId);

	// Attach response counts
	const surveysWithCounts = await Promise.all(
		surveys.map(async (survey) => {
			const responseCount = await getResponseCountBySurveyId(c.env.DB, survey.id);
			return { ...survey, response_count: responseCount };
		}),
	);

	return c.json({ surveys: surveysWithCounts });
});

// POST /api/surveys
surveyRouter.post("/", async (c) => {
	const userId = c.get("userId");
	const body = await c.req.json<{ title?: string }>();
	const title = body.title?.trim() || "Untitled Survey";
	const slug = generateSlug(title);

	const survey = await createSurvey(c.env.DB, generateId(), userId, title, slug);
	return c.json({ survey }, 201);
});

// GET /api/surveys/:id
surveyRouter.get("/:id", async (c) => {
	const userId = c.get("userId");
	const survey = await getSurveyById(c.env.DB, c.req.param("id"));

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const questions = await getQuestionsBySurveyId(c.env.DB, survey.id);
	const parsedQuestions = questions.map((q) => ({
		...q,
		options: q.options ? (JSON.parse(q.options) as string[]) : null,
		required: q.required === 1,
	}));

	return c.json({ survey, questions: parsedQuestions });
});

// PUT /api/surveys/:id
surveyRouter.put("/:id", async (c) => {
	const userId = c.get("userId");
	const survey = await getSurveyById(c.env.DB, c.req.param("id"));

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const body = await c.req.json<{
		title?: string;
		description?: string;
		primary_color?: string;
		logo_url?: string;
		is_active?: boolean;
	}>();

	const updated = await updateSurvey(c.env.DB, survey.id, {
		...(body.title !== undefined && { title: body.title }),
		...(body.description !== undefined && { description: body.description }),
		...(body.primary_color !== undefined && { primary_color: body.primary_color }),
		...(body.logo_url !== undefined && { logo_url: body.logo_url }),
		...(body.is_active !== undefined && { is_active: body.is_active ? 1 : 0 }),
	});

	return c.json({ survey: updated });
});

// DELETE /api/surveys/:id
surveyRouter.delete("/:id", async (c) => {
	const userId = c.get("userId");
	const survey = await getSurveyById(c.env.DB, c.req.param("id"));

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	await deleteSurvey(c.env.DB, survey.id);
	return c.json({ success: true });
});

// ─── Questions ────────────────────────────────────────────────────────────────

// POST /api/surveys/:id/questions
surveyRouter.post("/:id/questions", async (c) => {
	const userId = c.get("userId");
	const survey = await getSurveyById(c.env.DB, c.req.param("id"));

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const body = await c.req.json<{
		type: "short_text" | "long_text" | "multiple_choice" | "single_choice" | "rating";
		label?: string;
		required?: boolean;
		options?: string[];
		order_index?: number;
	}>();

	const existing = await getQuestionsBySurveyId(c.env.DB, survey.id);
	const orderIndex = body.order_index ?? existing.length;

	const question = await createQuestion(
		c.env.DB,
		generateId(),
		survey.id,
		body.type,
		body.label || "Untitled Question",
		orderIndex,
		body.required ?? false,
		body.options ?? null,
	);

	return c.json(
		{
			question: {
				...question,
				options: question.options ? (JSON.parse(question.options) as string[]) : null,
				required: question.required === 1,
			},
		},
		201,
	);
});

// PUT /api/questions/:questionId
surveyRouter.put("/questions/:questionId", async (c) => {
	const userId = c.get("userId");
	const questionId = c.req.param("questionId");

	// Verify ownership through survey
	const question = await c.env.DB.prepare(
		"SELECT q.*, s.user_id FROM questions q JOIN surveys s ON q.survey_id = s.id WHERE q.id = ?",
	)
		.bind(questionId)
		.first<{ user_id: string }>();

	if (!question) return c.json({ error: "Not found" }, 404);
	if (question.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const body = await c.req.json<{
		label?: string;
		required?: boolean;
		options?: string[];
		type?: string;
	}>();

	await updateQuestion(c.env.DB, questionId, {
		...(body.label !== undefined && { label: body.label }),
		...(body.required !== undefined && { required: body.required ? 1 : 0 }),
		...(body.options !== undefined && { options: JSON.stringify(body.options) }),
		...(body.type !== undefined && {
			type: body.type as
				| "short_text"
				| "long_text"
				| "multiple_choice"
				| "single_choice"
				| "rating",
		}),
	});

	return c.json({ success: true });
});

// DELETE /api/questions/:questionId
surveyRouter.delete("/questions/:questionId", async (c) => {
	const userId = c.get("userId");
	const questionId = c.req.param("questionId");

	const question = await c.env.DB.prepare(
		"SELECT q.*, s.user_id FROM questions q JOIN surveys s ON q.survey_id = s.id WHERE q.id = ?",
	)
		.bind(questionId)
		.first<{ user_id: string }>();

	if (!question) return c.json({ error: "Not found" }, 404);
	if (question.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	await deleteQuestion(c.env.DB, questionId);
	return c.json({ success: true });
});

// PATCH /api/surveys/:id/reorder
surveyRouter.patch("/:id/reorder", async (c) => {
	const userId = c.get("userId");
	const survey = await getSurveyById(c.env.DB, c.req.param("id"));

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const body = await c.req.json<{ order: { id: string; order_index: number }[] }>();
	await reorderQuestions(c.env.DB, body.order);

	return c.json({ success: true });
});