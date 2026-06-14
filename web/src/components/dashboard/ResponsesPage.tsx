import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/hooks/useToast";
import { type Question, type ResponsesData, type SurveyResponse, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	AlignLeft,
	ArrowLeft,
	BarChart2,
	Calendar,
	CheckSquare,
	ChevronDown,
	ChevronUp,
	Circle,
	Download,
	Loader2,
	Star,
	Type,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ResponsesPageProps {
	surveyId: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
	short_text: <Type className="w-3 h-3" />,
	long_text: <AlignLeft className="w-3 h-3" />,
	multiple_choice: <CheckSquare className="w-3 h-3" />,
	single_choice: <Circle className="w-3 h-3" />,
	rating: <Star className="w-3 h-3" />,
};

export function ResponsesPage({ surveyId }: ResponsesPageProps) {
	const [data, setData] = useState<ResponsesData | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"table" | "summary">("table");

	const fetchResponses = useCallback(async () => {
		try {
			const result = await api.surveys.getResponses(surveyId);
			setData(result);
		} catch (err) {
			toast({
				title: "Error loading responses",
				description: (err as Error).message,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [surveyId]);

	useEffect(() => {
		void fetchResponses();
	}, [fetchResponses]);

	const exportCsv = () => {
		if (!data) return;
		const headers = ["Response #", "Submitted At", ...data.questions.map((q) => q.label)];
		const rows = data.responses.map((r, i) => {
			const answerMap = Object.fromEntries(r.answers.map((a) => [a.question_id, a.value]));
			const submitted = new Date(r.submitted_at * 1000).toLocaleString();
			return [String(i + 1), submitted, ...data.questions.map((q) => answerMap[q.id] ?? "")];
		});

		const csvContent = [headers, ...rows]
			.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${data.survey.title.replace(/\s+/g, "-")}-responses.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const formatDate = (ts: number) =>
		new Date(ts * 1000).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

	// Compute per-question summary stats
	const getSummary = (q: Question) => {
		if (!data) return null;
		const allAnswers = data.responses
			.flatMap((r) => r.answers.filter((a) => a.question_id === q.id))
			.map((a) => a.value);

		if (q.type === "rating") {
			const nums = allAnswers.map(Number).filter((n) => !Number.isNaN(n));
			if (!nums.length) return { type: "rating", avg: null, counts: {} };
			const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
			const counts = Object.fromEntries(
				[1, 2, 3, 4, 5].map((n) => [n, nums.filter((x) => x === n).length]),
			);
			return { type: "rating", avg: avg.toFixed(1), counts };
		}

		if (q.type === "multiple_choice" || q.type === "single_choice") {
			const all = allAnswers.flatMap((v) => v.split("|||").filter(Boolean));
			const counts: Record<string, number> = {};
			for (const v of all) counts[v] = (counts[v] ?? 0) + 1;
			return { type: "choice", counts, total: all.length };
		}

		return { type: "text", answers: allAnswers };
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!data) return null;

	const { survey, questions, responses, total } = data;
	const primaryColor = survey.primary_color;

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<header className="border-b bg-white sticky top-0 z-10">
				<div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
					<Link
						to="/dashboard"
						className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
					>
						<ArrowLeft className="w-4 h-4" />
						<span className="hidden sm:block">Dashboard</span>
					</Link>

					<div className="w-px h-5 bg-border" />

					<div className="flex items-center gap-2 flex-1 min-w-0">
						<div
							className="w-2 h-2 rounded-full shrink-0"
							style={{ backgroundColor: primaryColor }}
						/>
						<span className="font-semibold text-sm truncate">{survey.title}</span>
						<Badge variant="secondary" className="shrink-0">
							<BarChart2 className="w-3 h-3 mr-1" />
							Responses
						</Badge>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<Link to="/builder/$surveyId" params={{ surveyId }}>
							<Button variant="outline" size="sm">
								Edit survey
							</Button>
						</Link>
						{total > 0 && (
							<Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
								<Download className="w-3.5 h-3.5" />
								Export CSV
							</Button>
						)}
					</div>
				</div>
			</header>

			<main className="max-w-5xl mx-auto px-6 py-8">
				{/* Stats row */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
					<StatCard
						icon={<Users className="w-4 h-4" />}
						label="Total responses"
						value={String(total)}
						color={primaryColor}
					/>
					<StatCard
						icon={<BarChart2 className="w-4 h-4" />}
						label="Questions"
						value={String(questions.length)}
						color={primaryColor}
					/>
					<StatCard
						icon={<Calendar className="w-4 h-4" />}
						label="Latest response"
						value={
							responses.length > 0
								? new Date(responses[0].submitted_at * 1000).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									})
								: "—"
						}
						color={primaryColor}
					/>
				</div>

				{total === 0 ? (
					<div className="text-center py-20 bg-white rounded-xl border animate-fade-in">
						<div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
							<BarChart2 className="w-7 h-7 text-muted-foreground" />
						</div>
						<h3 className="font-semibold text-lg mb-1">No responses yet</h3>
						<p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
							Share your survey link and responses will appear here.
						</p>
						<Link to="/builder/$surveyId" params={{ surveyId }}>
							<Button variant="outline" size="sm">
								Go to builder
							</Button>
						</Link>
					</div>
				) : (
					<>
						{/* View toggle */}
						<div className="flex items-center gap-2 mb-4">
							<div className="flex rounded-lg border overflow-hidden bg-white text-sm">
								<button
									type="button"
									onClick={() => setViewMode("table")}
									className={cn(
										"px-4 py-2 transition-colors",
										viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
									)}
								>
									Individual
								</button>
								<button
									type="button"
									onClick={() => setViewMode("summary")}
									className={cn(
										"px-4 py-2 transition-colors",
										viewMode === "summary"
											? "bg-primary text-primary-foreground"
											: "hover:bg-muted",
									)}
								>
									Summary
								</button>
							</div>
							<span className="text-sm text-muted-foreground">
								{total} response{total !== 1 ? "s" : ""}
							</span>
						</div>

						{viewMode === "table" ? (
							<div className="space-y-3">
								{responses.map((response, idx) => (
									<ResponseRow
										key={response.id}
										response={response}
										index={idx}
										questions={questions}
										isExpanded={expandedId === response.id}
										onToggle={() => setExpandedId(expandedId === response.id ? null : response.id)}
										formatDate={formatDate}
										primaryColor={primaryColor}
									/>
								))}
							</div>
						) : (
							<div className="space-y-4">
								{questions.map((q) => {
									const summary = getSummary(q);
									return (
										<div key={q.id} className="bg-white rounded-xl border p-5 animate-fade-in">
											<div className="flex items-center gap-2 mb-4">
												<span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
													{TYPE_ICONS[q.type]}
													{q.type.replace("_", " ")}
												</span>
												<p className="font-medium text-sm">{q.label}</p>
											</div>

											{summary?.type === "rating" && summary.counts && (
												<div className="space-y-2">
													{summary.avg && (
														<p className="text-2xl font-bold" style={{ color: primaryColor }}>
															{summary.avg}{" "}
															<span className="text-sm font-normal text-muted-foreground">avg</span>
														</p>
													)}
													<div className="space-y-1.5">
														{[5, 4, 3, 2, 1].map((n) => {
															const count = (summary.counts as Record<number, number>)[n] ?? 0;
															const pct = total > 0 ? Math.round((count / total) * 100) : 0;
															return (
																<div key={n} className="flex items-center gap-2 text-sm">
																	<span className="w-4 text-right text-muted-foreground">{n}</span>
																	<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
																		<div
																			className="h-full rounded-full transition-all"
																			style={{ width: `${pct}%`, backgroundColor: primaryColor }}
																		/>
																	</div>
																	<span className="w-8 text-xs text-muted-foreground">{count}</span>
																</div>
															);
														})}
													</div>
												</div>
											)}

											{summary?.type === "choice" && summary.counts && (
												<div className="space-y-2">
													{Object.entries(summary.counts as Record<string, number>)
														.sort(([, a], [, b]) => b - a)
														.map(([opt, count]) => {
															const pct = summary.total
																? Math.round((count / (summary.total as number)) * 100)
																: 0;
															return (
																<div key={opt} className="flex items-center gap-2 text-sm">
																	<span className="w-32 truncate text-sm">{opt}</span>
																	<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
																		<div
																			className="h-full rounded-full transition-all"
																			style={{ width: `${pct}%`, backgroundColor: primaryColor }}
																		/>
																	</div>
																	<span className="text-xs text-muted-foreground w-12 text-right">
																		{count} ({pct}%)
																	</span>
																</div>
															);
														})}
												</div>
											)}

											{summary?.type === "text" && (
												<div className="space-y-2 max-h-48 overflow-y-auto">
													{(summary.answers as string[]).filter(Boolean).length === 0 ? (
														<p className="text-sm text-muted-foreground">No answers yet</p>
													) : (
														(summary.answers as string[]).filter(Boolean).map((ans, i) => (
															<div
																key={`ans-${i}`}
																className="text-sm bg-muted/50 rounded-lg px-3 py-2"
															>
																{ans}
															</div>
														))
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</>
				)}
			</main>
		</div>
	);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
	icon,
	label,
	value,
	color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
	return (
		<div className="bg-white rounded-xl border p-4 flex items-center gap-3">
			<div
				className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
				style={{ backgroundColor: `${color}15`, color }}
			>
				{icon}
			</div>
			<div>
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-xl font-bold">{value}</p>
			</div>
		</div>
	);
}

interface ResponseRowProps {
	response: SurveyResponse;
	index: number;
	questions: Question[];
	isExpanded: boolean;
	onToggle: () => void;
	formatDate: (ts: number) => string;
	primaryColor: string;
}

function ResponseRow({
	response,
	index,
	questions,
	isExpanded,
	onToggle,
	formatDate,
	primaryColor,
}: ResponseRowProps) {
	const answerMap = Object.fromEntries(response.answers.map((a) => [a.question_id, a.value]));

	return (
		<div className="bg-white rounded-xl border overflow-hidden animate-fade-in">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
			>
				<span
					className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
					style={{ backgroundColor: primaryColor }}
				>
					{index + 1}
				</span>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium">Response #{index + 1}</p>
					<p className="text-xs text-muted-foreground">{formatDate(response.submitted_at)}</p>
				</div>
				<span className="text-xs text-muted-foreground shrink-0">
					{response.answers.length} answer{response.answers.length !== 1 ? "s" : ""}
				</span>
				{isExpanded ? (
					<ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
				) : (
					<ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
				)}
			</button>

			{isExpanded && (
				<div className="border-t px-4 py-4 space-y-3 animate-fade-in">
					{questions.map((q) => {
						const raw = answerMap[q.id];
						const displayValue = raw
							? q.type === "multiple_choice"
								? raw.split("|||").join(", ")
								: raw
							: null;

						return (
							<div key={q.id} className="grid grid-cols-[1fr,2fr] gap-3 text-sm">
								<div>
									<p className="font-medium text-foreground/80 leading-snug">{q.label}</p>
									<span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
										{TYPE_ICONS[q.type]}
										{q.type.replace("_", " ")}
									</span>
								</div>
								<div>
									{displayValue ? (
										<p className="bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
											{displayValue}
										</p>
									) : (
										<p className="text-muted-foreground italic text-xs py-2">No answer</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
