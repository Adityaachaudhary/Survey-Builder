import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/primitives";
import { type PublicSurveyData, type Question, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { AlignLeft, CheckSquare, ChevronRight, Circle, Loader2, Star, Type } from "lucide-react";
import { useEffect, useState } from "react";

interface PublicSurveyPageProps {
	slug: string;
}

export function PublicSurveyPage({ slug }: PublicSurveyPageProps) {
	const navigate = useNavigate();
	const [data, setData] = useState<PublicSurveyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.public
			.getSurvey(slug)
			.then(setData)
			.catch((err: Error) => setError(err.message))
			.finally(() => setLoading(false));
	}, [slug]);

	const setAnswer = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
		if (errors[questionId]) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next[questionId];
				return next;
			});
		}
	};

	const toggleMultiChoice = (questionId: string, option: string) => {
		const current = answers[questionId] ? answers[questionId].split("|||") : [];
		const idx = current.indexOf(option);
		const updated = idx === -1 ? [...current, option] : current.filter((_, i) => i !== idx);
		setAnswer(questionId, updated.join("|||"));
	};

	const validate = () => {
		if (!data) return false;
		const errs: Record<string, string> = {};
		for (const q of data.questions) {
			if (q.required && !answers[q.id]?.trim()) {
				errs[q.id] = "This question is required";
			}
		}
		setErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!data || !validate()) return;

		setSubmitting(true);
		try {
			await api.public.respond(
				slug,
				Object.entries(answers)
					.filter(([, v]) => v.trim())
					.map(([question_id, value]) => ({ question_id, value })),
			);
			void navigate({ to: "/s/$slug/done", params: { slug } });
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-sm">
					<div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">🔍</span>
					</div>
					<h2 className="font-semibold text-lg mb-1">Survey not found</h2>
					<p className="text-muted-foreground text-sm">
						{error ?? "This survey doesn't exist or is no longer accepting responses."}
					</p>
				</div>
			</div>
		);
	}

	const { survey, questions } = data;
	const primaryColor = survey.primary_color;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Brand top bar */}
			<div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

			{/* Header */}
			<div className="bg-white border-b">
				<div className="max-w-2xl mx-auto px-6 py-5">
					{survey.logo_url && (
						<img src={survey.logo_url} alt="logo" className="h-8 object-contain mb-4" />
					)}
					<h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
					{survey.description && (
						<p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
							{survey.description}
						</p>
					)}
					<div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1">
							<span
								className="w-1.5 h-1.5 rounded-full"
								style={{ backgroundColor: primaryColor }}
							/>
							{questions.length} question{questions.length !== 1 ? "s" : ""}
						</span>
					</div>
				</div>
			</div>

			{/* Form */}
			<div className="max-w-2xl mx-auto px-6 py-8">
				<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
					{questions.map((q, idx) => (
						<QuestionField
							key={q.id}
							question={q}
							index={idx}
							value={answers[q.id] ?? ""}
							error={errors[q.id]}
							primaryColor={primaryColor}
							onChange={(v) => setAnswer(q.id, v)}
							onMultiToggle={(opt) => toggleMultiChoice(q.id, opt)}
						/>
					))}

					{/* Submit */}
					<div className="pt-4">
						<Button
							type="submit"
							disabled={submitting}
							className="gap-2 px-8"
							style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
						>
							{submitting ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<>
									Submit <ChevronRight className="w-4 h-4" />
								</>
							)}
						</Button>
					</div>
				</form>

				<p className="text-xs text-muted-foreground mt-8 text-center">Built with Survey Builder</p>
			</div>
		</div>
	);
}

// ─── Individual question field ─────────────────────────────────────────────

interface QuestionFieldProps {
	question: Question;
	index: number;
	value: string;
	error?: string;
	primaryColor: string;
	onChange: (value: string) => void;
	onMultiToggle: (option: string) => void;
}

function QuestionField({
	question,
	index,
	value,
	error,
	primaryColor,
	onChange,
	onMultiToggle,
}: QuestionFieldProps) {
	const selectedMulti = value ? value.split("|||") : [];

	const cardBase = "bg-white rounded-xl border p-5 transition-shadow animate-fade-in";
	const errorStyle = error ? "border-red-300" : "";

	return (
		<div className={cn(cardBase, errorStyle)}>
			{/* Label */}
			<div className="flex items-start gap-2 mb-4">
				<span
					className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white mt-0.5"
					style={{ backgroundColor: primaryColor }}
				>
					{index + 1}
				</span>
				<div className="flex-1">
					<p className="font-medium text-sm leading-snug">
						{question.label}
						{question.required && <span className="text-red-500 ml-1">*</span>}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5 capitalize flex items-center gap-1">
						{question.type === "short_text" && <Type className="w-3 h-3" />}
						{question.type === "long_text" && <AlignLeft className="w-3 h-3" />}
						{question.type === "multiple_choice" && <CheckSquare className="w-3 h-3" />}
						{question.type === "single_choice" && <Circle className="w-3 h-3" />}
						{question.type === "rating" && <Star className="w-3 h-3" />}
						{question.type.replace("_", " ")}
					</p>
				</div>
			</div>

			{/* Input */}
			{question.type === "short_text" && (
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Your answer"
					className={cn(error && "border-red-300 focus-visible:ring-red-400")}
				/>
			)}

			{question.type === "long_text" && (
				<Textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Your answer"
					rows={4}
					className={cn(error && "border-red-300 focus-visible:ring-red-400")}
				/>
			)}

			{question.type === "multiple_choice" && question.options && (
				<div className="space-y-2">
					{question.options.map((opt) => {
						const checked = selectedMulti.includes(opt);
						return (
							<button
								key={opt}
								type="button"
								onClick={() => onMultiToggle(opt)}
								className={cn(
									"w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm text-left transition-all",
									checked ? "border-2" : "border hover:bg-muted/50",
								)}
								style={
									checked ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}
								}
							>
								<span
									className={cn(
										"w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-colors",
										checked ? "text-white" : "border-muted-foreground/40",
									)}
									style={
										checked ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}
									}
								>
									{checked && (
										<svg
											viewBox="0 0 12 12"
											className="w-2.5 h-2.5"
											fill="currentColor"
											aria-hidden="true"
										>
											<path
												d="M10 3L5 8.5 2 5.5"
												stroke="white"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
												fill="none"
											/>
										</svg>
									)}
								</span>
								{opt}
							</button>
						);
					})}
				</div>
			)}

			{question.type === "single_choice" && question.options && (
				<div className="space-y-2">
					{question.options.map((opt) => {
						const selected = value === opt;
						return (
							<button
								key={opt}
								type="button"
								onClick={() => onChange(opt)}
								className={cn(
									"w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm text-left transition-all",
									selected ? "border-2" : "border hover:bg-muted/50",
								)}
								style={
									selected
										? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }
										: {}
								}
							>
								<span
									className={cn(
										"w-4 h-4 rounded-full shrink-0 border-2 flex items-center justify-center transition-colors",
										selected ? "" : "border-muted-foreground/40",
									)}
									style={selected ? { borderColor: primaryColor } : {}}
								>
									{selected && (
										<span
											className="w-2 h-2 rounded-full"
											style={{ backgroundColor: primaryColor }}
										/>
									)}
								</span>
								{opt}
							</button>
						);
					})}
				</div>
			)}

			{question.type === "rating" && (
				<div className="flex gap-2 flex-wrap">
					{[1, 2, 3, 4, 5].map((n) => {
						const selected = value === String(n);
						return (
							<button
								key={n}
								type="button"
								onClick={() => onChange(String(n))}
								className={cn(
									"w-12 h-12 rounded-xl border-2 font-semibold text-sm transition-all hover:scale-105",
									selected
										? "text-white scale-105 shadow-md"
										: "text-muted-foreground hover:border-gray-300",
								)}
								style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
							>
								{n}
							</button>
						);
					})}
				</div>
			)}

			{error && (
				<p className="text-xs text-red-500 mt-2 flex items-center gap-1">
					<span>⚠</span> {error}
				</p>
			)}
		</div>
	);
}
