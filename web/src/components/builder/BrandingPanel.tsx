import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";
import { toast } from "@/hooks/useToast";
import type { Survey, SurveyUpdate } from "@/lib/api";
import { api } from "@/lib/api";
import { Image as ImageIcon, Link2, Loader2, Palette, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

const PRESET_COLORS = [
	"#6366f1",
	"#8b5cf6",
	"#ec4899",
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#3b82f6",
	"#0ea5e9",
	"#111827",
	"#64748b",
];

interface BrandingPanelProps {
	survey: Survey;
	onUpdate: (data: Partial<SurveyUpdate>) => void;
}

export function BrandingPanel({ survey, onUpdate }: BrandingPanelProps) {
	const [logoMode, setLogoMode] = useState<"url" | "upload">("url");
	const [logoUrl, setLogoUrl] = useState(survey.logo_url ?? "");
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const handleColorChange = (color: string) => {
		onUpdate({ primary_color: color });
	};

	const handleLogoUrlBlur = () => {
		if (logoUrl !== survey.logo_url) {
			onUpdate({ logo_url: logoUrl || null });
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file",
				description: "Please upload an image file.",
				variant: "destructive",
			});
			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			toast({
				title: "File too large",
				description: "Logo must be under 2MB.",
				variant: "destructive",
			});
			return;
		}

		setUploading(true);
		try {
			const { logo_url } = await api.surveys.uploadLogo(survey.id, file);
			onUpdate({ logo_url });
			setLogoUrl(logo_url);
			toast({ title: "Logo uploaded", variant: "default" });
		} catch (err) {
			toast({
				title: "Upload failed",
				description: (err as Error).message,
				variant: "destructive",
			});
		} finally {
			setUploading(false);
		}
	};

	const clearLogo = () => {
		setLogoUrl("");
		onUpdate({ logo_url: null });
	};

	return (
		<div className="space-y-6">
			{/* Primary color */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Palette className="w-4 h-4 text-muted-foreground" />
					<Label className="text-sm font-medium">Brand color</Label>
				</div>

				{/* Color presets */}
				<div className="grid grid-cols-6 gap-2">
					{PRESET_COLORS.map((color) => (
						<button
							key={color}
							type="button"
							onClick={() => handleColorChange(color)}
							className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
							style={{
								backgroundColor: color,
								borderColor: survey.primary_color === color ? color : "transparent",
								boxShadow:
									survey.primary_color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : "none",
							}}
							title={color}
						/>
					))}
				</div>

				{/* Custom color */}
				<div className="flex items-center gap-2">
					<input
						type="color"
						value={survey.primary_color}
						onChange={(e) => handleColorChange(e.target.value)}
						className="w-9 h-9 rounded-lg border border-input cursor-pointer p-0.5 bg-white"
					/>
					<Input
						value={survey.primary_color}
						onChange={(e) => {
							const val = e.target.value;
							if (/^#[0-9a-fA-F]{0,6}$/.test(val)) handleColorChange(val);
						}}
						className="font-mono text-sm h-9 flex-1"
						maxLength={7}
					/>
				</div>
			</div>

			{/* Logo */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<ImageIcon className="w-4 h-4 text-muted-foreground" />
					<Label className="text-sm font-medium">Logo</Label>
				</div>

				{/* Current logo preview */}
				{survey.logo_url && (
					<div className="relative w-24 h-12 bg-muted rounded-lg overflow-hidden border group">
						<img
							src={survey.logo_url}
							alt="Survey logo"
							className="w-full h-full object-contain p-1"
						/>
						<button
							type="button"
							onClick={clearLogo}
							className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<X className="w-4 h-4 text-white" />
						</button>
					</div>
				)}

				{/* Mode tabs */}
				<div className="flex rounded-lg border overflow-hidden text-xs">
					<button
						type="button"
						onClick={() => setLogoMode("url")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${logoMode === "url" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
					>
						<Link2 className="w-3 h-3" />
						URL
					</button>
					<button
						type="button"
						onClick={() => setLogoMode("upload")}
						className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${logoMode === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
					>
						<Upload className="w-3 h-3" />
						Upload
					</button>
				</div>

				{logoMode === "url" ? (
					<Input
						value={logoUrl}
						onChange={(e) => setLogoUrl(e.target.value)}
						onBlur={handleLogoUrlBlur}
						placeholder="https://example.com/logo.png"
						className="text-sm"
					/>
				) : (
					<>
						<input
							ref={fileRef}
							type="file"
							accept="image/*"
							onChange={(e) => void handleFileUpload(e)}
							className="hidden"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileRef.current?.click()}
							disabled={uploading}
							className="w-full gap-2"
						>
							{uploading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Upload className="w-4 h-4" />
							)}
							{uploading ? "Uploading..." : "Choose image"}
						</Button>
						<p className="text-xs text-muted-foreground">PNG, JPG, SVG · Max 2MB</p>
					</>
				)}
			</div>

			{/* Live preview */}
			<div className="space-y-2">
				<Label className="text-sm font-medium">Preview</Label>
				<div
					className="rounded-xl p-4 border text-white text-sm"
					style={{ backgroundColor: survey.primary_color }}
				>
					{survey.logo_url && (
						<img
							src={survey.logo_url}
							alt="logo"
							className="h-6 object-contain mb-3 brightness-0 invert opacity-90"
						/>
					)}
					<p className="font-semibold">{survey.title}</p>
					<p className="text-white/70 text-xs mt-0.5">Survey preview</p>
				</div>
			</div>
		</div>
	);
}
