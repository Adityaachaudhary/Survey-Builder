import { type PublicSurveyData, api } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ThankYouPageProps {
	slug: string;
}

export function ThankYouPage({ slug }: ThankYouPageProps) {
	const [data, setData] = useState<PublicSurveyData | null>(null);

	useEffect(() => {
		api.public
			.getSurvey(slug)
			.then(setData)
			.catch(() => null);
	}, [slug]);

	const primaryColor = data?.survey.primary_color ?? "#6366f1";

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			<div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

			<div className="flex-1 flex items-center justify-center px-6">
				<div className="text-center max-w-sm animate-fade-in">
					<div
						className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
						style={{ backgroundColor: primaryColor }}
					>
						<CheckCircle2 className="w-8 h-8 text-white" />
					</div>

					<h1 className="text-2xl font-bold mb-2">Thank you!</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Your response to{" "}
						<span className="font-medium text-foreground">
							{data?.survey.title ?? "this survey"}
						</span>{" "}
						has been recorded. We appreciate your time.
					</p>

					{data?.survey.logo_url && (
						<img
							src={data.survey.logo_url}
							alt="logo"
							className="h-7 object-contain mx-auto mt-8 opacity-60"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
