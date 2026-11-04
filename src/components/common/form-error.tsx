import type { ReactNode } from "react";

type Props = { children?: ReactNode; details?: string[] };

export function FormError({ children, details }: Props) {
	if (!children) return null;
	return (
		<div
			role="alert"
			className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
		>
			<p>{children}</p>
			{details && details.length > 0 && (
				<ul className="mt-2 max-h-40 list-inside list-disc overflow-auto font-mono text-xs">
					{details.map((d) => (
						<li key={d}>{d}</li>
					))}
				</ul>
			)}
		</div>
	);
}
