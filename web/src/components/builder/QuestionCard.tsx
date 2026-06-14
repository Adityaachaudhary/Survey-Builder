import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { Label, Separator } from "@/components/ui/primitives";
import type { Question, QuestionType } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	AlignLeft,
	CheckSquare,
	ChevronDown,
	ChevronUp,
	Circle,
	GripVertical,
	Plus,
	Star,
	Trash2,
	Type,
	X,
} from "lucide-react";
import { useRef, useState } from "react";

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
	{ value: "short_text", label: "Short text", icon: <Type className="w-3.5 h-3.5" /> },
	{ value: "long_text", label: "Long text", icon: <AlignLeft className="w-3.5 h-3.5" /> },
	{
		value: "multiple_choice",
		label: "Multiple choice",
		icon: <CheckSquare className="w-3.5 h-3.5" />,
	},
	{ value: "single_choice", label: "Single choice", icon: <Circle className="w-3.5 h-3.5" /> },
	{ value: "rating", label: "Rating (1–5)", icon: <Star className="w-3.5 h-3.5" /> },
];

interface QuestionCardProps {
	question: Question;
	index: number;
	onUpdate: (id: string, data: Partial<Question>) => void;
	onDelete: (id: string) => void;
}

export function QuestionCard({ question, index, onUpdate, onDelete }: QuestionCardProps) {
	const [expanded, setExpanded] = useState(true);
	const [localLabel, setLocalLabel] = useState(question.label);
	const [localOptions, setLocalOptions] = useState<string[]>(
		question.options ?? ["Option 1", "Option 2"],
	);
	const newOptionRef = useRef<HTMLInputElement>(null);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: question.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const handleLabelBlur = () => {
		if (localLabel !== question.label) {
			onUpdate(question.id, { label: localLabel });
		}
	};

	const handleOptionChange = (idx: number, value: string) => {
		const updated = [...localOptions];
		updated[idx] = value;
		setLocalOptions(updated);
	};

	const handleOptionBlur = () => {
		onUpdate(question.id, { options: localOptions });
	};

	const addOption = () => {
		const updated = [...localOptions, `Option ${localOptions.length + 1}`];
		setLocalOptions(updated);
		onUpdate(question.id, { options: updated });
		// Focus the new input
		setTimeout(() => newOptionRef.current?.focus(), 50);
	};

	const removeOption = (idx: number) => {
		if (localOptions.length <= 1) return;
		const updated = localOptions.filter((_, i) => i !== idx);
		setLocalOptions(updated);
		onUpdate(question.id, { options: updated });
	};

	const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type) ?? QUESTION_TYPES[0];

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"bg-white border rounded-xl transition-shadow",
				isDragging ? "shadow-lg border-primary/30 opacity-90" : "shadow-sm",
			)}
		>
			{/* Card header */}
			<div className="flex items-center gap-3 p-4">
				{/* Drag handle */}
				<button
					type="button"
					className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="w-4 h-4" />
				</button>

				{/* Question number */}
				<span className="text-xs font-medium text-muted-foreground w-5 text-right shrink-0">
					{index + 1}
				</span>

				{/* Type badge */}
				<span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
					{typeInfo.icon}
					{typeInfo.label}
				</span>

				{/* Label preview */}
				<p className="text-sm font-medium truncate flex-1 min-w-0">
					{question.label || "Untitled question"}
				</p>

				{/* Actions */}
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setExpanded((p) => !p)}
						className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
					>
						{expanded ? (
							<ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
						) : (
							<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
						)}
					</button>
					<button
						type="button"
						onClick={() => onDelete(question.id)}
						className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
					>
						<Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
					</button>
				</div>
			</div>

			{/* Expanded editor */}
			{expanded && (
				<>
					<Separator />
					<div className="p-4 space-y-4 animate-fade-in">
						{/* Question type selector */}
						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-wide text-muted-foreground">
								Question type
							</Label>
							<div className="flex flex-wrap gap-1.5">
								{QUESTION_TYPES.map((t) => (
									<button
										key={t.value}
										type="button"
										onClick={() => onUpdate(question.id, { type: t.value })}
										className={cn(
											"flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border",
											question.type === t.value
												? "bg-primary text-primary-foreground border-primary"
												: "bg-white text-muted-foreground border-border hover:bg-muted",
										)}
									>
										{t.icon}
										{t.label}
									</button>
								))}
							</div>
						</div>

						{/* Label */}
						<div className="space-y-2">
							<Label
								htmlFor={`label-${question.id}`}
								className="text-xs uppercase tracking-wide text-muted-foreground"
							>
								Question text
							</Label>
							<Input
								id={`label-${question.id}`}
								value={localLabel}
								onChange={(e) => setLocalLabel(e.target.value)}
								onBlur={handleLabelBlur}
								placeholder="Ask something..."
							/>
						</div>

						{/* Options for choice questions */}
						{(question.type === "multiple_choice" || question.type === "single_choice") && (
							<div className="space-y-2">
								<Label className="text-xs uppercase tracking-wide text-muted-foreground">
									Options
								</Label>
								<div className="space-y-2">
									{localOptions.map((opt, idx) => (
										<div key={`opt-${idx}`} className="flex items-center gap-2">
											<div className="w-4 h-4 shrink-0 flex items-center justify-center">
												{question.type === "multiple_choice" ? (
													<div className="w-3 h-3 rounded-sm border-2 border-muted-foreground/40" />
												) : (
													<div className="w-3 h-3 rounded-full border-2 border-muted-foreground/40" />
												)}
											</div>
											<Input
												ref={idx === localOptions.length - 1 ? newOptionRef : undefined}
												value={opt}
												onChange={(e) => handleOptionChange(idx, e.target.value)}
												onBlur={handleOptionBlur}
												placeholder={`Option ${idx + 1}`}
												className="h-8 text-sm"
											/>
											<button
												type="button"
												onClick={() => removeOption(idx)}
												disabled={localOptions.length <= 1}
												className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30"
											>
												<X className="w-3.5 h-3.5" />
											</button>
										</div>
									))}
									<Button
										variant="ghost"
										size="sm"
										onClick={addOption}
										className="gap-1.5 text-xs h-8 pl-7"
									>
										<Plus className="w-3 h-3" />
										Add option
									</Button>
								</div>
							</div>
						)}

						{/* Rating preview */}
						{question.type === "rating" && (
							<div className="space-y-2">
								<Label className="text-xs uppercase tracking-wide text-muted-foreground">
									Preview
								</Label>
								<div className="flex gap-2">
									{[1, 2, 3, 4, 5].map((n) => (
										<div
											key={n}
											className="w-9 h-9 rounded-lg border-2 border-muted flex items-center justify-center text-sm font-medium text-muted-foreground"
										>
											{n}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Required toggle */}
						<div className="flex items-center justify-between pt-1">
							<div>
								<p className="text-sm font-medium">Required</p>
								<p className="text-xs text-muted-foreground">
									Respondents must answer this question
								</p>
							</div>
							<Switch
								checked={question.required}
								onCheckedChange={(checked) => onUpdate(question.id, { required: checked })}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
