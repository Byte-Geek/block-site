import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-8",
				className,
			)}
		>
			{children}
		</div>
	);
}

type HeaderProps = {
	title: ReactNode;
	description?: ReactNode;
	back?: ReactNode;
	actions?: ReactNode;
};

export function PageHeader({ title, description, back, actions }: HeaderProps) {
	return (
		<div className="flex flex-col gap-2">
			{back}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
					{description && (
						<div className="text-sm text-muted-foreground">{description}</div>
					)}
				</div>
				{actions}
			</div>
		</div>
	);
}
