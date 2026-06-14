import { Hono } from "hono";
import {
	createResponse,
	getAnswersByResponseId,
	getQuestionsBySurveyId,
	getResponseCountBySurveyId,
	getResponsesBySurveyId,
	getSurveyById,
	getSurveyBySlug,
} from "../db/queries";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

export const publicRouter = new Hono<{
	Bindings: Env;
	Variables: { userId: string };
}>();

// GET /api/s/:slug — public survey fetch (no auth)
publicRouter.get("/:slug", async (c) => {
	const survey = await getSurveyBySlug(c.env.DB, c.req.param("slug"));

	if (!survey) return c.json({ error: "Survey not found" }, 404);

	const questions = await getQuestionsBySurveyId(c.env.DB, survey.id);
	const parsedQuestions = questions.map((q) => ({
		id: q.id,
		type: q.type,
		label: q.label,
		required: q.required === 1,
		options: q.options ? (JSON.parse(q.options) as string[]) : null,
		order_index: q.order_index,
	}));

	return c.json({
		survey: {
			id: survey.id,
			title: survey.title,
			description: survey.description,
			slug: survey.slug,
			primary_color: survey.primary_color,
			logo_url: survey.logo_url,
		},
		questions: parsedQuestions,
	});
});

// POST /api/s/:slug/respond — anonymous response submission
publicRouter.post("/:slug/respond", async (c) => {
	const survey = await getSurveyBySlug(c.env.DB, c.req.param("slug"));

	if (!survey) return c.json({ error: "Survey not found" }, 404);

	const body = await c.req.json<{
		answers: { question_id: string; value: string }[];
	}>();

	if (!Array.isArray(body.answers) || body.answers.length === 0) {
		return c.json({ error: "answers array is required" }, 400);
	}

	// Validate all question IDs belong to this survey
	const questions = await getQuestionsBySurveyId(c.env.DB, survey.id);
	const validIds = new Set(questions.map((q) => q.id));

	for (const answer of body.answers) {
		if (!validIds.has(answer.question_id)) {
			return c.json({ error: `Invalid question_id: ${answer.question_id}` }, 400);
		}
	}

	// Check required questions are answered
	const requiredIds = questions.filter((q) => q.required === 1).map((q) => q.id);
	const answeredIds = new Set(body.answers.map((a) => a.question_id));
	for (const reqId of requiredIds) {
		if (!answeredIds.has(reqId)) {
			const q = questions.find((q) => q.id === reqId);
			return c.json({ error: `Required question not answered: ${q?.label}` }, 400);
		}
	}

	const responseId = crypto.randomUUID();
	const answers = body.answers.map((a) => ({
		id: crypto.randomUUID(),
		questionId: a.question_id,
		value: a.value,
	}));

	await createResponse(c.env.DB, responseId, survey.id, answers);

	return c.json({ success: true, response_id: responseId }, 201);
});

// GET /api/surveys/:id/responses — owner views responses (auth required)
publicRouter.get("/survey/:id/responses", requireAuth, async (c) => {
	const userId = c.get("userId") as string;
	const surveyId = c.req.param("id");
	if (!surveyId) return c.json({ error: "Survey ID required" }, 400);
	const survey = await getSurveyById(c.env.DB, surveyId);

	if (!survey) return c.json({ error: "Not found" }, 404);
	if (survey.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

	const questions = await getQuestionsBySurveyId(c.env.DB, survey.id);
	const responses = await getResponsesBySurveyId(c.env.DB, survey.id);

	// Fetch all answers for each response
	const responsesWithAnswers = await Promise.all(
		responses.map(async (response) => {
			const answers = await getAnswersByResponseId(c.env.DB, response.id);
			return { ...response, answers };
		}),
	);

	const responseCount = await getResponseCountBySurveyId(c.env.DB, survey.id);

	return c.json({
		survey: {
			id: survey.id,
			title: survey.title,
			primary_color: survey.primary_color,
		},
		questions: questions.map((q) => ({
			...q,
			options: q.options ? (JSON.parse(q.options) as string[]) : null,
			required: q.required === 1,
		})),
		responses: responsesWithAnswers,
		total: responseCount,
	});
});
