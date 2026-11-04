import { Pill, type Tone } from "@/components/common/status-badge";
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

export type TimelineBranch = {
	id: string;
	name: string;
	badge?: { tone: Tone; label: string };
	events: TimelineEvent[];
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

function Events({
	events,
	showWho = true,
}: {
	events: TimelineEvent[];
	showWho?: boolean;
}) {
	return (
		<ol className="relative ml-1.5 flex flex-col gap-6 border-l pl-6">
			{events.map((e) => (
				<li key={e.id} className="relative">
					<span
						aria-hidden
						className={cn(
							"absolute top-1 left-[-1.9rem] size-3 rounded-full ring-4 ring-card",
							dots[e.tone],
						)}
					/>
					<p className="text-sm font-medium">{e.title}</p>
					{showWho && (
						<p className="text-xs text-muted-foreground">
							{e.who} · {e.role}
						</p>
					)}
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

export default function Timeline({
	events,
	branches = [],
}: {
	events: TimelineEvent[];
	branches?: TimelineBranch[];
}) {
	if (events.length === 0 && branches.length === 0)
		return (
			<p className="text-sm text-muted-foreground">Nu există evenimente.</p>
		);

	return (
		<div className="flex flex-col">
			{events.length > 0 && <Events events={events} />}

			{branches.length > 0 && events.length > 0 && (
				<div aria-hidden className="ml-1.5 h-6 border-l" />
			)}

			{branches.map((b, i) => {
				const last = i === branches.length - 1;
				return (
					<div
						key={b.id}
						className={cn(
							"relative ml-1.5 border-l pl-8",
							last ? "border-transparent" : "pb-6",
						)}
					>
						{events.length > 0 &&
							(last ? (
								<span
									aria-hidden
									className="absolute top-0 -left-px h-3 w-9.75 rounded-bl-xl border-b border-l"
								/>
							) : (
								<span
									aria-hidden
									className="absolute top-3 left-0 w-9.5 border-t"
								/>
							))}
						<span
							aria-hidden
							className="absolute top-3 left-9.5 h-5 border-l"
						/>

						<div className="mb-2 ml-1.5 flex h-6 items-center gap-2 pl-6">
							<span className="text-sm font-semibold">{b.name}</span>
							{b.badge && <Pill tone={b.badge.tone}>{b.badge.label}</Pill>}
						</div>
						{b.events.length === 0 ? (
							<p className="ml-1.5 pl-6 text-xs text-muted-foreground">
								Niciun eveniment încă.
							</p>
						) : (
							<Events events={b.events} showWho={false} />
						)}
					</div>
				);
			})}
		</div>
	);
}
