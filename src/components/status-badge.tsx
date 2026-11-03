import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ispStatusLabels, stageLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tones = {
	slate: "bg-slate-100 text-slate-700",
	blue: "bg-blue-100 text-blue-800",
	violet: "bg-violet-100 text-violet-800",
	teal: "bg-teal-100 text-teal-800",
	amber: "bg-amber-100 text-amber-800",
	green: "bg-green-100 text-green-800",
	red: "bg-red-100 text-red-800",
} as const;

export type Tone = keyof typeof tones;

const stageTones: Record<string, Tone> = {
	initiator: "amber",
	asp: "blue",
	anr: "violet",
	isp: "teal",
	closed: "green",
	draft: "slate",
	cancelled: "slate",
};

export const ispTones: Record<string, Tone> = {
	queued: "slate",
	dispatched: "blue",
	acknowledged: "violet",
	completed: "green",
	partial_failure: "amber",
	impossible: "red",
};

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
	return (
		<Badge variant="outline" className={cn("border-transparent", tones[tone])}>
			<span className="size-1.5 rounded-full bg-current" />
			{children}
		</Badge>
	);
}

export function StageBadge({ stage }: { stage: string }) {
	return (
		<Pill tone={stageTones[stage] ?? "slate"}>
			{stageLabels[stage] ?? stage}
		</Pill>
	);
}

export function IspStatusBadge({ status }: { status: string | null }) {
	if (!status) return <Pill tone="slate">Nesetată</Pill>;
	return (
		<Pill tone={ispTones[status] ?? "slate"}>
			{ispStatusLabels[status] ?? status}
		</Pill>
	);
}
