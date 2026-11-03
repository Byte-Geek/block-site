import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="flex flex-col gap-4 p-8">
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-4 w-80" />
			<Skeleton className="h-64 w-full max-w-3xl" />
		</div>
	);
}
