import type { Tone } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineEvent = {
	id: string;
	at: Date;
	title: string;
	who: string;
	role: string;
	note?: string | null;
	tone: Tone | "primary";
};

const dots: Record<Tone | "primary", string> = {
	primary: "bg-primary",
	slate: "bg-slate-400",
	blue: "bg-blue-600",
	violet: "bg-violet-600",
	teal: "bg-teal-600",
	amber: "bg-amber-500",
	green: "bg-green-600",
	red: "bg-red-600",
};

export default function Timeline({ events }: { events: TimelineEvent[] }) {
	if (events.length === 0)
		return (
			<p className="text-sm text-muted-foreground">Nu există evenimente.</p>
		);

	return (
		<ol className="relative ml-1.5 flex flex-col gap-6 border-l pl-6">
			{events.map((e) => (
				<li key={e.id} className="relative">
					<span
						aria-hidden
						className={cn(
							"absolute top-1 -left-[1.9rem] size-3 rounded-full ring-4 ring-card",
							dots[e.tone],
						)}
					/>
					<p className="text-sm font-medium">{e.title}</p>
					<p className="text-xs text-muted-foreground">
						{e.who} · {e.role}
					</p>
					{e.note && (
						<p className="mt-2 rounded-md bg-muted p-2 text-sm whitespace-pre-line">
							{e.note}
						</p>
					)}
					<time
						dateTime={e.at.toISOString()}
						className="mt-1 block text-xs text-muted-foreground"
					>
						{formatDateTime(e.at)}
					</time>
				</li>
			))}
		</ol>
	);
}
