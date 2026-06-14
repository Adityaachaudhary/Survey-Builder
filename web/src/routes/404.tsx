import { Button } from "@/components/ui/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/404")({
	component: NotFoundPage,
});

export function NotFoundPage() {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-sm animate-fade-in">
				<p className="text-8xl font-bold text-muted-foreground/20 mb-4">404</p>
				<h1 className="text-2xl font-bold mb-2">Page not found</h1>
				<p className="text-muted-foreground text-sm mb-6">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<Link to="/dashboard">
					<Button className="gap-2">
						<ArrowLeft className="w-4 h-4" />
						Back to dashboard
					</Button>
				</Link>
			</div>
		</div>
	);
}
