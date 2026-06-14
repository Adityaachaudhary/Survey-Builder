import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { type Question, type Survey, type SurveyUpdate, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	Copy,
	ExternalLink,
	Eye,
	LayoutGrid,
	Loader2,
	Paintbrush,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandingPanel } from "./BrandingPanel";
import { QuestionCard } from "./QuestionCard";

type ActiveTab = "questions" | "branding";

interface BuilderPageProps {
	surveyId: string;
}

export function BuilderPage({ surveyId }: BuilderPageProps) {
	const navigate = useNavigate();
	const { user } = useAuth();

	const [survey, setSurvey] = useState<Survey | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState<ActiveTab>("questions");
	const [copiedLink, setCopiedLink] = useState(false);
	const [editingTitle, setEditingTitle] = useState(false);
	const [titleValue, setTitleValue] = useState("");
	const titleRef = useRef<HTMLInputElement>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const fetchSurvey = useCallback(async () => {
		try {
			const { survey, questions } = await api.surveys.get(surveyId);
			setSurvey(survey);
			setQuestions(questions);
			setTitleValue(survey.title);
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
			void navigate({ to: "/dashboard" });
		} finally {
			setLoading(false);
		}
	}, [surveyId, navigate]);

	useEffect(() => {
		void fetchSurvey();
	}, [fetchSurvey]);

	const handleSurveyUpdate = useCallback(
		async (data: Partial<SurveyUpdate>) => {
			if (!survey) return;
			setSaving(true);
			try {
				const { survey: updated } = await api.surveys.update(survey.id, data);
				if (updated) setSurvey(updated);
			} catch (err) {
				toast({
					title: "Save failed",
					description: (err as Error).message,
					variant: "destructive",
				});
			} finally {
				setSaving(false);
			}
		},
		[survey],
	);

	const handleTitleSave = () => {
		setEditingTitle(false);
		if (titleValue.trim() && titleValue !== survey?.title) {
			void handleSurveyUpdate({ title: titleValue.trim() });
		}
	};

	const handleAddQuestion = async (type: Question["type"] = "short_text") => {
		if (!survey) return;
		try {
			const { question } = await api.surveys.addQuestion(survey.id, {
				type,
				label: "Untitled question",
			});
			setQuestions((prev) => [...prev, question]);
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
		}
	};

	const handleUpdateQuestion = useCallback(
		async (id: string, data: Partial<Question>) => {
			if (!survey) return;
			// Optimistic update
			setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...data } : q)));
			try {
				await api.surveys.updateQuestion(survey.id, id, data);
			} catch (err) {
				toast({
					title: "Save failed",
					description: (err as Error).message,
					variant: "destructive",
				});
				void fetchSurvey(); // rollback
			}
		},
		[survey, fetchSurvey],
	);

	const handleDeleteQuestion = useCallback(
		async (id: string) => {
			if (!survey) return;
			setQuestions((prev) => prev.filter((q) => q.id !== id));
			try {
				await api.surveys.deleteQuestion(survey.id, id);
			} catch (err) {
				toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
				void fetchSurvey();
			}
		},
		[survey, fetchSurvey],
	);

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id || !survey) return;

		const oldIdx = questions.findIndex((q) => q.id === active.id);
		const newIdx = questions.findIndex((q) => q.id === over.id);
		const reordered = arrayMove(questions, oldIdx, newIdx).map((q, i) => ({
			...q,
			order_index: i,
		}));
		setQuestions(reordered);

		try {
			await api.surveys.reorder(
				survey.id,
				reordered.map((q) => ({ id: q.id, order_index: q.order_index })),
			);
		} catch (err) {
			toast({
				title: "Reorder failed",
				description: (err as Error).message,
				variant: "destructive",
			});
			void fetchSurvey();
		}
	};

	const copyShareLink = async () => {
		if (!survey) return;
		const url = `${window.location.origin}/s/${survey.slug}`;
		await navigator.clipboard.writeText(url);
		setCopiedLink(true);
		setTimeout(() => setCopiedLink(false), 2000);
		toast({ title: "Link copied", description: url, variant: "default" });
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!survey) return null;

	const shareUrl = `${window.location.origin}/s/${survey.slug}`;

	return (
		<div className="min-h-screen bg-gray-50/50 flex flex-col">
			{/* Top bar */}
			<header className="border-b bg-white sticky top-0 z-20">
				<div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
					{/* Back */}
					<Link
						to="/dashboard"
						className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
					>
						<ArrowLeft className="w-4 h-4" />
						<span className="hidden sm:block">Dashboard</span>
					</Link>

					<div className="w-px h-5 bg-border" />

					{/* Title */}
					{editingTitle ? (
						<Input
							ref={titleRef}
							value={titleValue}
							onChange={(e) => setTitleValue(e.target.value)}
							onBlur={handleTitleSave}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleTitleSave();
								if (e.key === "Escape") {
									setEditingTitle(false);
									setTitleValue(survey.title);
								}
							}}
							className="h-8 text-sm font-medium max-w-xs"
							autoFocus
						/>
					) : (
						<button
							type="button"
							onClick={() => {
								setEditingTitle(true);
								setTimeout(() => titleRef.current?.select(), 10);
							}}
							className="text-sm font-semibold hover:bg-muted px-2 py-1 rounded-md transition-colors truncate max-w-[200px]"
						>
							{survey.title}
						</button>
					)}

					{saving && (
						<Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
					)}

					<div className="flex-1" />

					{/* Share link */}
					<div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs text-muted-foreground max-w-[220px]">
						<span className="truncate">{shareUrl}</span>
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() => void copyShareLink()}
						className="gap-1.5 hidden sm:flex"
					>
						{copiedLink ? (
							<Check className="w-3.5 h-3.5 text-green-600" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
						{copiedLink ? "Copied" : "Copy link"}
					</Button>

					<a href={shareUrl} target="_blank" rel="noreferrer">
						<Button variant="outline" size="icon" className="h-8 w-8">
							<Eye className="w-3.5 h-3.5" />
						</Button>
					</a>
				</div>
			</header>

			<div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-6">
				{/* Left: questions / branding tabs */}
				<div className="w-72 shrink-0 space-y-4">
					{/* Tab switcher */}
					<div className="flex rounded-lg border overflow-hidden bg-white text-sm">
						<button
							type="button"
							onClick={() => setActiveTab("questions")}
							className={cn(
								"flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors",
								activeTab === "questions" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
							)}
						>
							<LayoutGrid className="w-3.5 h-3.5" />
							Questions
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("branding")}
							className={cn(
								"flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors",
								activeTab === "branding" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
							)}
						>
							<Paintbrush className="w-3.5 h-3.5" />
							Branding
						</button>
					</div>

					{activeTab === "questions" ? (
						<div className="space-y-3">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								{questions.length} question{questions.length !== 1 ? "s" : ""}
							</p>
							<Button
								variant="outline"
								size="sm"
								className="w-full gap-2 justify-center border-dashed"
								onClick={() => void handleAddQuestion("short_text")}
							>
								<Plus className="w-4 h-4" />
								Add question
							</Button>

							{/* Quick add by type */}
							<div className="grid grid-cols-2 gap-1.5">
								{(
									[
										["short_text", "Short text"],
										["long_text", "Long text"],
										["multiple_choice", "Multi choice"],
										["single_choice", "Single choice"],
										["rating", "Rating 1–5"],
									] as const
								).map(([type, label]) => (
									<button
										key={type}
										type="button"
										onClick={() => void handleAddQuestion(type)}
										className="text-xs text-left px-2.5 py-2 rounded-lg border bg-white hover:bg-muted hover:border-primary/30 transition-colors"
									>
										+ {label}
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="bg-white rounded-xl border p-4">
							<BrandingPanel survey={survey} onUpdate={(data) => void handleSurveyUpdate(data)} />
						</div>
					)}
				</div>

				{/* Main: question cards */}
				<div className="flex-1 min-w-0">
					{questions.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
							<div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
								<LayoutGrid className="w-8 h-8 text-muted-foreground" />
							</div>
							<h3 className="font-semibold mb-1">No questions yet</h3>
							<p className="text-sm text-muted-foreground mb-6 max-w-xs">
								Add your first question using the panel on the left, or click below.
							</p>
							<Button onClick={() => void handleAddQuestion()} className="gap-2">
								<Plus className="w-4 h-4" />
								Add first question
							</Button>
						</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={(e) => void handleDragEnd(e)}
						>
							<SortableContext
								items={questions.map((q) => q.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-3">
									{questions.map((q, idx) => (
										<QuestionCard
											key={q.id}
											question={q}
											index={idx}
											onUpdate={(id, data) => void handleUpdateQuestion(id, data)}
											onDelete={(id) => void handleDeleteQuestion(id)}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}

					{questions.length > 0 && (
						<Button
							variant="outline"
							className="w-full mt-4 gap-2 border-dashed"
							onClick={() => void handleAddQuestion()}
						>
							<Plus className="w-4 h-4" />
							Add question
						</Button>
					)}
				</div>

				{/* Right: live preview */}
				<div className="w-72 shrink-0 hidden xl:block">
					<div className="sticky top-20">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
							<ExternalLink className="w-3.5 h-3.5" />
							Preview
						</p>
						<div className="rounded-xl border overflow-hidden shadow-sm bg-white scale-90 origin-top">
							<div className="h-2" style={{ backgroundColor: survey.primary_color }} />
							<div className="p-4 space-y-3">
								{survey.logo_url && (
									<img src={survey.logo_url} alt="logo" className="h-5 object-contain" />
								)}
								<h3 className="font-semibold text-sm">{survey.title}</h3>
								{questions.slice(0, 3).map((q, i) => (
									<div key={q.id} className="text-xs text-muted-foreground">
										<p className="font-medium text-foreground">
											{i + 1}. {q.label}
										</p>
										{q.type === "rating" && (
											<div className="flex gap-1 mt-1">
												{[1, 2, 3, 4, 5].map((n) => (
													<div
														key={n}
														className="w-5 h-5 rounded border text-center text-xs flex items-center justify-center"
													>
														{n}
													</div>
												))}
											</div>
										)}
									</div>
								))}
								{questions.length > 3 && (
									<p className="text-xs text-muted-foreground">+{questions.length - 3} more</p>
								)}
								<button
									type="button"
									className="w-full py-1.5 rounded-lg text-xs font-medium text-white mt-2"
									style={{ backgroundColor: survey.primary_color }}
								>
									Submit
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
