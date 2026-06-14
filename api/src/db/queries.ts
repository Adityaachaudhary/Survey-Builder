import type { Env } from "../types";

export type QuestionType =
	| "short_text"
	| "long_text"
	| "multiple_choice"
	| "single_choice"
	| "rating";

export interface User {
	id: string;
	email: string;
	created_at: number;
}

export interface Survey {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	slug: string;
	primary_color: string;
	logo_url: string | null;
	is_active: number;
	created_at: number;
	updated_at: number;
}

export interface Question {
	id: string;
	survey_id: string;
	type: QuestionType;
	label: string;
	required: number;
	options: string | null; // JSON string
	order_index: number;
	created_at: number;
}

export interface Response {
	id: string;
	survey_id: string;
	respondent_id: string | null;
	submitted_at: number;
}

export interface Answer {
	id: string;
	response_id: string;
	question_id: string;
	value: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
	return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<User>();
}

export async function createUser(db: D1Database, id: string, email: string): Promise<User> {
	await db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").bind(id, email).run();
	return { id, email, created_at: Math.floor(Date.now() / 1000) };
}

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
	return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
}

// ─── Surveys ─────────────────────────────────────────────────────────────────

export async function getSurveysByUserId(db: D1Database, userId: string): Promise<Survey[]> {
	const result = await db
		.prepare("SELECT * FROM surveys WHERE user_id = ? ORDER BY created_at DESC")
		.bind(userId)
		.all<Survey>();
	return result.results;
}

export async function getSurveyById(db: D1Database, id: string): Promise<Survey | null> {
	return db.prepare("SELECT * FROM surveys WHERE id = ?").bind(id).first<Survey>();
}

export async function getSurveyBySlug(db: D1Database, slug: string): Promise<Survey | null> {
	return db
		.prepare("SELECT * FROM surveys WHERE slug = ? AND is_active = 1")
		.bind(slug)
		.first<Survey>();
}

export async function createSurvey(
	db: D1Database,
	id: string,
	userId: string,
	title: string,
	slug: string,
): Promise<Survey> {
	await db
		.prepare("INSERT INTO surveys (id, user_id, title, slug) VALUES (?, ?, ?, ?)")
		.bind(id, userId, title, slug)
		.run();
	const created = await getSurveyById(db, id);
	if (!created) throw new Error("Failed to create survey");
	return created;
}

export async function updateSurvey(
	db: D1Database,
	id: string,
	data: Partial<Pick<Survey, "title" | "description" | "primary_color" | "logo_url" | "is_active">>,
): Promise<Survey | null> {
	const fields = Object.keys(data)
		.map((k) => `${k} = ?`)
		.join(", ");
	const values = Object.values(data);
	await db
		.prepare(`UPDATE surveys SET ${fields}, updated_at = unixepoch() WHERE id = ?`)
		.bind(...values, id)
		.run();
	return getSurveyById(db, id);
}

export async function deleteSurvey(db: D1Database, id: string): Promise<void> {
	await db.prepare("DELETE FROM surveys WHERE id = ?").bind(id).run();
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function getQuestionsBySurveyId(
	db: D1Database,
	surveyId: string,
): Promise<Question[]> {
	const result = await db
		.prepare("SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC")
		.bind(surveyId)
		.all<Question>();
	return result.results;
}

export async function createQuestion(
	db: D1Database,
	id: string,
	surveyId: string,
	type: QuestionType,
	label: string,
	orderIndex: number,
	required = false,
	options: string[] | null = null,
): Promise<Question> {
	const optionsJson = options ? JSON.stringify(options) : null;
	await db
		.prepare(
			"INSERT INTO questions (id, survey_id, type, label, required, options, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(id, surveyId, type, label, required ? 1 : 0, optionsJson, orderIndex)
		.run();
	return db
		.prepare("SELECT * FROM questions WHERE id = ?")
		.bind(id)
		.first<Question>() as Promise<Question>;
}

export async function updateQuestion(
	db: D1Database,
	id: string,
	data: Partial<Pick<Question, "label" | "required" | "options" | "order_index" | "type">>,
): Promise<void> {
	const fields = Object.keys(data)
		.map((k) => `${k} = ?`)
		.join(", ");
	const values = Object.values(data);
	await db
		.prepare(`UPDATE questions SET ${fields} WHERE id = ?`)
		.bind(...values, id)
		.run();
}

export async function deleteQuestion(db: D1Database, id: string): Promise<void> {
	await db.prepare("DELETE FROM questions WHERE id = ?").bind(id).run();
}

export async function reorderQuestions(
	db: D1Database,
	updates: { id: string; order_index: number }[],
): Promise<void> {
	const stmts = updates.map(({ id, order_index }) =>
		db.prepare("UPDATE questions SET order_index = ? WHERE id = ?").bind(order_index, id),
	);
	await db.batch(stmts);
}

// ─── Responses ───────────────────────────────────────────────────────────────

export async function getResponsesBySurveyId(
	db: D1Database,
	surveyId: string,
): Promise<Response[]> {
	const result = await db
		.prepare("SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC")
		.bind(surveyId)
		.all<Response>();
	return result.results;
}

export async function getAnswersByResponseId(
	db: D1Database,
	responseId: string,
): Promise<Answer[]> {
	const result = await db
		.prepare("SELECT * FROM answers WHERE response_id = ?")
		.bind(responseId)
		.all<Answer>();
	return result.results;
}

export async function createResponse(
	db: D1Database,
	responseId: string,
	surveyId: string,
	answers: { id: string; questionId: string; value: string }[],
): Promise<void> {
	const stmts = [
		db.prepare("INSERT INTO responses (id, survey_id) VALUES (?, ?)").bind(responseId, surveyId),
		...answers.map(({ id, questionId, value }) =>
			db
				.prepare("INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)")
				.bind(id, responseId, questionId, value),
		),
	];
	await db.batch(stmts);
}

export async function getResponseCountBySurveyId(
	db: D1Database,
	surveyId: string,
): Promise<number> {
	const result = await db
		.prepare("SELECT COUNT(*) as count FROM responses WHERE survey_id = ?")
		.bind(surveyId)
		.first<{ count: number }>();
	return result?.count ?? 0;
}
