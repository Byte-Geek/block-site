import { cn } from "@/lib/utils";

function initials(name: string) {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}

export default function UserAvatar({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary",
				className,
			)}
		>
			{initials(name)}
		</span>
	);
}
