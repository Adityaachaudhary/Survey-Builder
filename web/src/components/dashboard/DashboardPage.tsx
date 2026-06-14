import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge, Card, CardContent } from "@/components/ui/primitives";
import { Label } from "@/components/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { type SurveyWithCount, api } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import {
	BarChart2,
	ChevronRight,
	ExternalLink,
	FileText,
	LayoutGrid,
	Loader2,
	LogOut,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function DashboardPage() {
	const { user, logout } = useAuth();
	const [surveys, setSurveys] = useState<SurveyWithCount[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [newSurveyTitle, setNewSurveyTitle] = useState("");
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fetchSurveys = useCallback(async () => {
		try {
			const { surveys } = await api.surveys.list();
			setSurveys(surveys);
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchSurveys();
	}, [fetchSurveys]);

	const handleCreate = async () => {
		const title = newSurveyTitle.trim() || "Untitled Survey";
		setCreating(true);
		try {
			const { survey } = await api.surveys.create(title);
			setSurveys((prev) => [{ ...survey, response_count: 0 }, ...prev]);
			setShowCreateDialog(false);
			setNewSurveyTitle("");
			toast({
				title: "Survey created",
				description: "Start adding questions in the builder.",
				variant: "default",
			});
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
		} finally {
			setCreating(false);
		}
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		try {
			await api.surveys.delete(id);
			setSurveys((prev) => prev.filter((s) => s.id !== id));
			toast({ title: "Survey deleted", variant: "default" });
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
		} finally {
			setDeletingId(null);
		}
	};

	const formatDate = (ts: number) =>
		new Date(ts * 1000).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<header className="border-b bg-white sticky top-0 z-10">
				<div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center">
							<LayoutGrid className="w-3.5 h-3.5 text-primary" />
						</div>
						<span className="font-semibold text-sm">Survey Builder</span>
					</div>

					<div className="flex items-center gap-3">
						<span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
						<Button variant="ghost" size="sm" onClick={() => void logout()} className="gap-1.5">
							<LogOut className="w-3.5 h-3.5" />
							<span className="hidden sm:block">Sign out</span>
						</Button>
					</div>
				</div>
			</header>

			<main className="max-w-5xl mx-auto px-6 py-10">
				{/* Page header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Your Surveys</h1>
						<p className="text-muted-foreground text-sm mt-1">
							{surveys.length} {surveys.length === 1 ? "survey" : "surveys"}
						</p>
					</div>
					<Button onClick={() => setShowCreateDialog(true)} className="gap-2">
						<Plus className="w-4 h-4" />
						New Survey
					</Button>
				</div>

				{/* Survey list */}
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				) : surveys.length === 0 ? (
					<div className="text-center py-20 animate-fade-in">
						<div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
							<FileText className="w-8 h-8 text-muted-foreground" />
						</div>
						<h3 className="font-semibold text-lg mb-2">No surveys yet</h3>
						<p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
							Create your first survey and start collecting responses in minutes.
						</p>
						<Button onClick={() => setShowCreateDialog(true)} className="gap-2">
							<Plus className="w-4 h-4" />
							Create your first survey
						</Button>
					</div>
				) : (
					<div className="grid gap-3">
						{surveys.map((survey) => (
							<Card
								key={survey.id}
								className="group hover:border-primary/30 hover:shadow-sm transition-all duration-150 animate-fade-in"
							>
								<CardContent className="p-0">
									<div className="flex items-center gap-4 p-5">
										{/* Color swatch */}
										<div
											className="w-2 self-stretch rounded-full shrink-0"
											style={{ backgroundColor: survey.primary_color }}
										/>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<h3 className="font-semibold text-sm truncate">{survey.title}</h3>
												{survey.is_active ? (
													<Badge variant="secondary" className="text-xs">
														Active
													</Badge>
												) : (
													<Badge variant="outline" className="text-xs">
														Draft
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-4 text-xs text-muted-foreground">
												<span className="flex items-center gap-1">
													<BarChart2 className="w-3 h-3" />
													{survey.response_count}{" "}
													{survey.response_count === 1 ? "response" : "responses"}
												</span>
												<span>Created {formatDate(survey.created_at)}</span>
											</div>
										</div>

										{/* Actions */}
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<a
												href={`/s/${survey.slug}`}
												target="_blank"
												rel="noreferrer"
												className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
												title="Open public survey"
											>
												<ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
											</a>
											<Link
												to="/responses/$surveyId"
												params={{ surveyId: survey.id }}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
												title="View responses"
											>
												<BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
											</Link>
											<button
												type="button"
												onClick={() => void handleDelete(survey.id)}
												disabled={deletingId === survey.id}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
												title="Delete survey"
											>
												{deletingId === survey.id ? (
													<Loader2 className="w-3.5 h-3.5 animate-spin" />
												) : (
													<Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
												)}
											</button>
										</div>

										<Link
											to="/builder/$surveyId"
											params={{ surveyId: survey.id }}
											className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline shrink-0"
										>
											<Settings className="w-3.5 h-3.5" />
											Edit
											<ChevronRight className="w-3 h-3" />
										</Link>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</main>

			{/* Create dialog */}
			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>New survey</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="survey-title">Survey title</Label>
						<Input
							id="survey-title"
							placeholder="e.g. Customer Feedback Q1"
							value={newSurveyTitle}
							onChange={(e) => setNewSurveyTitle(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") void handleCreate();
							}}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button onClick={() => void handleCreate()} disabled={creating}>
							{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create survey"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
