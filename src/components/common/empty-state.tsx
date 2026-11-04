import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
	icon: LucideIcon;
	title: string;
	children: ReactNode;
	action?: ReactNode;
};

export default function EmptyState({
	icon: Icon,
	title,
	children,
	action,
}: Props) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
			<div className="flex size-10 items-center justify-center rounded-full bg-muted">
				<Icon className="size-5 text-muted-foreground" />
			</div>
			<p className="font-medium">{title}</p>
			<p className="max-w-sm text-sm text-muted-foreground">{children}</p>
			{action}
		</div>
	);
}
