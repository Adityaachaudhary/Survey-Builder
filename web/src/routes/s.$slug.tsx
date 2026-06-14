import { PublicSurveyPage } from "@/components/survey/PublicSurveyPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$slug")({
	component: PublicSurveyRoute,
});

function PublicSurveyRoute() {
	const { slug } = Route.useParams();
	return <PublicSurveyPage slug={slug} />;
}
