import Link from "next/link";
import { cn } from "@/lib/utils";

export type CaseTab = "raport" | "descriere" | "comentarii" | "fisiere";

type Props = {
	basePath: string;
	active: CaseTab;
	hasReport: boolean;
	counts: { comentarii: number; fisiere: number };
};

export default function CaseTabs({
	basePath,
	active,
	hasReport,
	counts,
}: Props) {
	const tabs: { key: CaseTab; label: string; count?: number }[] = [
		...(hasReport ? [{ key: "raport" as const, label: "Raport" }] : []),
		{ key: "descriere", label: "Descriere" },
		{ key: "comentarii", label: "Comentarii", count: counts.comentarii },
		{ key: "fisiere", label: "Fișiere", count: counts.fisiere },
	];

	return (
		<nav className="flex gap-1 border-b" aria-label="Secțiuni caz">
			{tabs.map((t) => (
				<Link
					key={t.key}
					href={`${basePath}?tab=${t.key}`}
					aria-current={active === t.key ? "page" : undefined}
					className={cn(
						"-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
						active === t.key
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground",
					)}
				>
					{t.label}
					{t.count ? (
						<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
							{t.count}
						</span>
					) : null}
				</Link>
			))}
		</nav>
	);
}
