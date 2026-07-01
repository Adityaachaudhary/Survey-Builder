import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart2, GripVertical, LayoutGrid, Star, Type } from "lucide-react";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const { user, loading } = useAuth();

	if (loading) {
		return null;
	}

	if (user) {
		return <Navigate to="/dashboard" />;
	}

	return (
		<div className="min-h-screen bg-background flex flex-col overflow-hidden">
			{/* Navbar */}
			<header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-border/40">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
						<LayoutGrid className="w-4 h-4 text-primary" />
					</div>
					<span className="font-bold tracking-tight">Survey Builder</span>
				</div>
			</header>

			{/* Hero */}
			<main className="flex flex-col items-center px-4 pt-16 pb-8">
				<div className="space-y-6 max-w-3xl text-center animate-fade-in">
					<h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 pb-2">
						Surveys that feel like your brand.
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
						Build beautiful surveys, apply your visual identity, and share a link instantly. Stop using boring, generic forms.
					</p>
					<div className="pt-2 flex items-center justify-center gap-4">
						<Link
							to="/login"
							className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground h-12 px-8 text-base font-medium shadow-sm transition-all hover:scale-105 hover:bg-primary/90 gap-2"
						>
							Get Started <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</div>

				{/* UI Mockup */}
				<div className="mt-16 w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden animate-slide-in bg-white">
					{/* Browser chrome */}
					<div className="bg-gray-100 border-b px-4 py-3 flex items-center gap-2">
						<div className="w-3 h-3 rounded-full bg-red-400" />
						<div className="w-3 h-3 rounded-full bg-amber-400" />
						<div className="w-3 h-3 rounded-full bg-green-400" />
						<div className="mx-auto bg-white rounded-md border text-xs text-gray-400 px-3 py-1 w-64 text-center">
							surveybuilder.app/builder/customer-nps
						</div>
					</div>

					{/* Mock App Layout */}
					<div className="flex h-[480px]">
						{/* Left sidebar */}
						<div className="w-64 border-r bg-gray-50/50 p-4 flex flex-col gap-3 shrink-0">
							<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Questions</div>
							{[
								{ icon: <Type className="w-3 h-3" />, label: "What's your name?", active: true },
								{ icon: <BarChart2 className="w-3 h-3" />, label: "Rate your experience", active: false },
								{ icon: <Type className="w-3 h-3" />, label: "Any feedback for us?", active: false },
							].map((q, i) => (
								<div
									key={i}
									className={`flex items-center gap-2 p-2.5 rounded-lg text-xs cursor-pointer ${
										q.active
											? "bg-indigo-50 border border-indigo-200 text-indigo-700"
											: "hover:bg-gray-100 text-gray-600"
									}`}
								>
									<GripVertical className="w-3 h-3 text-gray-300" />
									<span className="text-gray-400">{q.icon}</span>
									<span className="truncate font-medium">{q.label}</span>
								</div>
							))}
							<div className="mt-auto">
								<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Branding</div>
								<div className="flex gap-1.5 flex-wrap">
									{["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"].map((c) => (
										<div
											key={c}
											className={`w-6 h-6 rounded-full border-2 cursor-pointer ${c === "#6366f1" ? "border-gray-900 scale-110" : "border-transparent"}`}
											style={{ backgroundColor: c }}
										/>
									))}
								</div>
							</div>
						</div>

						{/* Main canvas */}
						<div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-8">
							<div className="w-full max-w-md bg-white rounded-xl shadow-md border p-6 space-y-4">
								<div className="flex items-center gap-2 mb-4">
									<div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
										<LayoutGrid className="w-3 h-3 text-white" />
									</div>
									<span className="text-xs font-semibold text-indigo-700">Customer NPS Survey</span>
								</div>
								<h3 className="text-base font-semibold text-gray-800">What's your name?</h3>
								<div className="h-9 rounded-lg border bg-gray-50 px-3 flex items-center text-xs text-gray-400">
									Type your answer here…
								</div>
								<div className="flex justify-end pt-2">
									<div className="bg-indigo-600 text-white text-xs rounded-full px-4 py-1.5 font-medium">
										Next →
									</div>
								</div>
							</div>
							<div className="mt-4 flex items-center gap-1">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className={`h-1.5 rounded-full ${i === 1 ? "w-6 bg-indigo-600" : "w-3 bg-gray-200"}`}
									/>
								))}
							</div>
						</div>

						{/* Right panel */}
						<div className="w-52 border-l bg-white p-4 flex flex-col gap-4 shrink-0">
							<div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Analytics</div>
							<div className="space-y-2">
								<div className="text-xs text-gray-500">Responses</div>
								<div className="text-2xl font-bold text-gray-800">142</div>
								<div className="text-xs text-green-600 font-medium">↑ 12% this week</div>
							</div>
							<div className="space-y-1.5">
								<div className="text-xs text-gray-500 mb-2">Rating distribution</div>
								{[5, 4, 3].map((star) => (
									<div key={star} className="flex items-center gap-2">
										<div className="flex items-center gap-0.5">
											<Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
											<span className="text-xs text-gray-500">{star}</span>
										</div>
										<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
											<div
												className="h-full bg-indigo-500 rounded-full"
												style={{ width: `${[70, 50, 30][5 - star]}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
