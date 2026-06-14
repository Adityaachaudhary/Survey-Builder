import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound, LayoutGrid, Loader2, Mail } from "lucide-react";
import { useState } from "react";

export function LoginPage() {
	const navigate = useNavigate();
	const { refetch } = useAuth();

	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSendOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		setLoading(true);
		try {
			await api.auth.sendOtp(email.trim().toLowerCase());
			setStep("otp");
			toast({
				title: "Code sent",
				description: `Check ${email} for your sign-in code.`,
				variant: "default",
			});
		} catch (err) {
			toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!otp.trim()) return;
		setLoading(true);
		try {
			await api.auth.verifyOtp(email, otp.trim());
			await refetch();
			void navigate({ to: "/dashboard" });
		} catch (err) {
			toast({ title: "Invalid code", description: (err as Error).message, variant: "destructive" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex">
			{/* Left — brand panel */}
			<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex-col justify-between p-12 text-white">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
						<LayoutGrid className="w-4 h-4" />
					</div>
					<span className="font-semibold text-lg tracking-tight">Survey Builder</span>
				</div>

				<div>
					<h1 className="text-4xl font-bold leading-tight mb-4">
						Surveys that feel like your brand.
					</h1>
					<p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
						Build beautiful surveys, apply your visual identity, and share a link. Responses come
						back in one clean dashboard.
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4">
					{["Builder", "Branding", "Responses"].map((label, i) => (
						<div key={label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
							<div className="text-2xl font-bold mb-1">{["01", "02", "03"][i]}</div>
							<div className="text-sm text-indigo-200">{label}</div>
						</div>
					))}
				</div>
			</div>

			{/* Right — auth form */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-sm animate-fade-in">
					<div className="flex items-center gap-2 mb-8 lg:hidden">
						<div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
							<LayoutGrid className="w-4 h-4 text-primary" />
						</div>
						<span className="font-semibold text-lg">Survey Builder</span>
					</div>

					{step === "email" ? (
						<>
							<h2 className="text-2xl font-bold mb-1">Sign in</h2>
							<p className="text-muted-foreground mb-8">
								Enter your email to receive a sign-in code.
							</p>

							<form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="email">Email address</Label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<Input
											id="email"
											type="email"
											placeholder="you@example.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="pl-9"
											autoFocus
											required
										/>
									</div>
								</div>

								<Button type="submit" className="w-full" disabled={loading}>
									{loading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<>
											Send code <ArrowRight className="w-4 h-4" />
										</>
									)}
								</Button>
							</form>
						</>
					) : (
						<>
							<h2 className="text-2xl font-bold mb-1">Check your email</h2>
							<p className="text-muted-foreground mb-2">
								We sent a 6-digit code to{" "}
								<span className="font-medium text-foreground">{email}</span>
							</p>
							<button
								type="button"
								onClick={() => setStep("email")}
								className="text-sm text-primary hover:underline mb-8 block"
							>
								Use a different email
							</button>

							<form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="otp">Sign-in code</Label>
									<div className="relative">
										<KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<Input
											id="otp"
											type="text"
											inputMode="numeric"
											placeholder="000000"
											value={otp}
											onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
											className="pl-9 text-center text-xl tracking-widest font-mono"
											maxLength={6}
											autoFocus
											required
										/>
									</div>
								</div>

								<Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
									{loading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<>
											Sign in <ArrowRight className="w-4 h-4" />
										</>
									)}
								</Button>
							</form>
						</>
					)}

					<p className="text-xs text-muted-foreground mt-8 text-center">
						By signing in you agree to our terms of service.
					</p>
				</div>
			</div>
		</div>
	);
}
