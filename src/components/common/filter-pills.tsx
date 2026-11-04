import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterPill = {
	key: string;
	label: string;
	count: number;
	href: string;
	active: boolean;
};

export default function FilterPills({ items }: { items: FilterPill[] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{items.map((p) => (
				<Button
					key={p.key || "all"}
					asChild
					size="sm"
					variant={p.active ? "default" : "outline"}
					className="rounded-full"
				>
					<Link href={p.href}>
						{p.label}
						<span
							className={cn(
								"tabular-nums",
								p.active ? "opacity-80" : "text-muted-foreground",
							)}
						>
							{p.count}
						</span>
					</Link>
				</Button>
			))}
		</div>
	);
}
