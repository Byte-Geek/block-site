import { Check } from "lucide-react";
import { stageLabels } from "@/lib/cases/constants";
import { cn } from "@/lib/utils";

const steps = ["initiator", "asp", "anr", "isp", "closed"] as const;

export default function CaseStepper({ stage }: { stage: string }) {
	const closed = stage === "closed";
	const returned = stage === "initiator";
	const current = Math.max(0, steps.indexOf(stage as (typeof steps)[number]));

	return (
		<ol className="grid grid-cols-5">
			{steps.map((s, i) => {
				const state =
					closed || i < current ? "done" : i === current ? "current" : "todo";
				const finalDone = closed && i === steps.length - 1;

				return (
					<li
						key={s}
						aria-current={state === "current" ? "step" : undefined}
						className="relative flex flex-col items-center gap-2 text-center"
					>
						{i < steps.length - 1 && (
							<span
								aria-hidden
								className={cn(
									"absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2",
									closed || i < current ? "bg-primary" : "bg-border",
								)}
							/>
						)}
						<span
							className={cn(
								"relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-background text-xs font-medium",
								state === "done" &&
									"border-primary bg-primary text-primary-foreground",
								finalDone && "border-green-600 bg-green-600",
								state === "current" &&
									!returned &&
									"border-primary text-primary ring-4 ring-primary/15",
								state === "current" &&
									returned &&
									"border-amber-500 text-amber-600 ring-4 ring-amber-500/15",
								state === "todo" && "border-border text-muted-foreground",
							)}
						>
							{state === "done" ? <Check className="size-4" /> : i + 1}
						</span>
						<span
							className={cn(
								"text-xs",
								state === "todo"
									? "text-muted-foreground"
									: "font-medium text-foreground",
							)}
						>
							{stageLabels[s]}
						</span>
					</li>
				);
			})}
		</ol>
	);
}
