import { ResponsesPage } from "@/components/dashboard/ResponsesPage";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/responses/$surveyId")({
	component: ResponsesRoute,
});

function ResponsesRoute() {
	const { surveyId } = Route.useParams();
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) return <Navigate to="/" />;

	return <ResponsesPage surveyId={surveyId} />;
}
