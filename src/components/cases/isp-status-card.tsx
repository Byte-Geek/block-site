import { Pill, type Tone } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type IspItem = {
	id: string;
	name: string;
	label: string;
	tone: Tone;
	done: boolean;
};

function joinNames(names: string[]) {
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} și ${names[names.length - 1]}`;
}

export default function IspStatusCard({
	items,
	closed,
}: {
	items: IspItem[];
	closed: boolean;
}) {
	const total = items.length;
	const done = items.filter((i) => i.done).length;
	const pending = items.filter((i) => !i.done);
	const percent = total === 0 ? 0 : Math.round((done / total) * 100);

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{total === 1 ? "1 ISP participant" : `${total} ISP-uri participante`}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span>Sarcini create</span>
						<span className="font-semibold tabular-nums">
							{total} / {total}
						</span>
					</div>
					<div
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={total}
						aria-valuenow={done}
						aria-label="ISP-uri care și-au încheiat sarcina"
						className="h-2 overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-green-600 transition-[width]"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<div className="flex items-center justify-between text-xs">
						<span className="text-green-700">{done} încheiate</span>
						<span className="text-amber-700">
							{pending.length} în așteptare
						</span>
					</div>
				</div>

				<Separator />

				<ul className="flex flex-col gap-3">
					{items.map((i) => (
						<li
							key={i.id}
							className="flex items-center justify-between gap-3 text-sm"
						>
							<span className="truncate font-medium">{i.name}</span>
							<Pill tone={i.tone}>{i.label}</Pill>
						</li>
					))}
				</ul>

				<Separator />

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="font-semibold">Starea procesului</span>
						<Pill tone={closed ? "green" : "amber"}>
							{closed ? "Închis" : "Activ"}
						</Pill>
					</div>
					<p className="text-xs text-muted-foreground">
						{pending.length === 0
							? "Toate ISP-urile și-au încheiat sarcinile."
							: `Procesul nu se finalizează până când ${joinNames(pending.map((p) => p.name))} nu ${pending.length === 1 ? "își încheie sarcina" : "își încheie sarcinile"}.`}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
