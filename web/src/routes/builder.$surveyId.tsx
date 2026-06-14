import { BuilderPage } from "@/components/builder/BuilderPage";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/builder/$surveyId")({
	component: BuilderRoute,
});

function BuilderRoute() {
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

	return <BuilderPage surveyId={surveyId} />;
}
