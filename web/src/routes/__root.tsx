import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: () => (
		<AuthProvider>
			<Outlet />
			<Toaster />
		</AuthProvider>
	),
});
