import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
	href: string;
	label: string;
	value: number | null;
	icon: LucideIcon;
	hint?: string;
	highlight?: boolean;
};

export default function StatCard({
	href,
	label,
	value,
	icon: Icon,
	hint,
	highlight,
}: Props) {
	return (
		<Link href={href} className="group">
			<Card
				className={cn(
					"transition-colors group-hover:border-primary/40",
					highlight && "border-primary/30 bg-primary/5",
				)}
			>
				<CardContent className="flex items-start justify-between gap-4">
					<div>
						<p className="text-sm text-muted-foreground">{label}</p>
						<p className="mt-1 text-3xl font-semibold tabular-nums">
							{value ?? "—"}
						</p>
						{hint && (
							<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
						)}
					</div>
					<div
						className={cn(
							"flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary",
							highlight && "bg-primary/10 text-primary",
						)}
					>
						<Icon className="size-4" />
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
