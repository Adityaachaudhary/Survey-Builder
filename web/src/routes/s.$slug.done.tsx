import { ThankYouPage } from "@/components/survey/ThankYouPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$slug/done")({
	component: ThankYouRoute,
});

function ThankYouRoute() {
	const { slug } = Route.useParams();
	return <ThankYouPage slug={slug} />;
}
