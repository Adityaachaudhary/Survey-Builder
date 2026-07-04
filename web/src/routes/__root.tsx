import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { Outlet, createRootRoute } from "@tanstack/react-router";

function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-sm animate-fade-in">
				<p className="text-8xl font-bold text-muted-foreground/20 mb-4">404</p>
				<h1 className="text-2xl font-bold mb-2">Page not found</h1>
				<p className="text-muted-foreground text-sm mb-6">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<div className="flex items-center justify-center gap-3">
					<a
						href="/"
						className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
					>
						🏠 Home
					</a>
					<a
						href="/dashboard"
						className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
					>
						← Dashboard
					</a>
				</div>
			</div>
		</div>
	);
}

export const Route = createRootRoute({
	component: () => (
		<AuthProvider>
			<Outlet />
			<Toaster />
		</AuthProvider>
	),
	notFoundComponent: NotFound,
});
