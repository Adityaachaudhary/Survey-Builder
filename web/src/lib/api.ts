const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
		...init,
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "Request failed" }));
		throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export const api = {
	// Auth
	auth: {
		sendOtp: (email: string) =>
			request<{ success: boolean }>("/auth/send-otp", {
				method: "POST",
				body: JSON.stringify({ email }),
			}),
		verifyOtp: (email: string, otp: string) =>
			request<{ success: boolean; user: { id: string; email: string } }>("/auth/verify-otp", {
				method: "POST",
				body: JSON.stringify({ email, otp }),
			}),
		me: () => request<{ user: { id: string; email: string } | null }>("/auth/me"),
		logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
	},

	// Surveys
	surveys: {
		list: () => request<{ surveys: SurveyWithCount[] }>("/surveys"),
		create: (title: string) =>
			request<{ survey: Survey }>("/surveys", {
				method: "POST",
				body: JSON.stringify({ title }),
			}),
		get: (id: string) => request<{ survey: Survey; questions: Question[] }>(`/surveys/${id}`),
		update: (id: string, data: Partial<SurveyUpdate>) =>
			request<{ survey: Survey }>(`/surveys/${id}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		delete: (id: string) => request<{ success: boolean }>(`/surveys/${id}`, { method: "DELETE" }),
		addQuestion: (surveyId: string, question: AddQuestionPayload) =>
			request<{ question: Question }>(`/surveys/${surveyId}/questions`, {
				method: "POST",
				body: JSON.stringify(question),
			}),
		updateQuestion: (surveyId: string, questionId: string, data: Partial<Question>) =>
			request<{ success: boolean }>(`/surveys/questions/${questionId}`, {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		deleteQuestion: (surveyId: string, questionId: string) =>
			request<{ success: boolean }>(`/surveys/questions/${questionId}`, {
				method: "DELETE",
			}),
		reorder: (surveyId: string, order: { id: string; order_index: number }[]) =>
			request<{ success: boolean }>(`/surveys/${surveyId}/reorder`, {
				method: "PATCH",
				body: JSON.stringify({ order }),
			}),
		uploadLogo: (surveyId: string, file: File) => {
			return fetch(`${BASE}/surveys/${surveyId}/logo`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": file.type },
				body: file,
			}).then((r) => r.json()) as Promise<{ logo_url: string }>;
		},
		getResponses: (surveyId: string) => request<ResponsesData>(`/s/survey/${surveyId}/responses`),
	},

	// Public
	public: {
		getSurvey: (slug: string) => request<PublicSurveyData>(`/s/${slug}`),
		respond: (slug: string, answers: { question_id: string; value: string }[]) =>
			request<{ success: boolean; response_id: string }>(`/s/${slug}/respond`, {
				method: "POST",
				body: JSON.stringify({ answers }),
			}),
	},
};

// Types
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

export interface SurveyWithCount extends Survey {
	response_count: number;
}

export interface SurveyUpdate {
	title: string;
	description: string | null;
	primary_color: string;
	logo_url: string | null;
	is_active: boolean;
}

export type QuestionType =
	| "short_text"
	| "long_text"
	| "multiple_choice"
	| "single_choice"
	| "rating";

export interface Question {
	id: string;
	survey_id: string;
	type: QuestionType;
	label: string;
	required: boolean;
	options: string[] | null;
	order_index: number;
}

export interface AddQuestionPayload {
	type: QuestionType;
	label?: string;
	required?: boolean;
	options?: string[];
}

export interface PublicSurveyData {
	survey: {
		id: string;
		title: string;
		description: string | null;
		slug: string;
		primary_color: string;
		logo_url: string | null;
	};
	questions: Question[];
}

export interface ResponseAnswer {
	id: string;
	response_id: string;
	question_id: string;
	value: string;
}

export interface SurveyResponse {
	id: string;
	survey_id: string;
	submitted_at: number;
	answers: ResponseAnswer[];
}

export interface ResponsesData {
	survey: { id: string; title: string; primary_color: string };
	questions: Question[];
	responses: SurveyResponse[];
	total: number;
}
