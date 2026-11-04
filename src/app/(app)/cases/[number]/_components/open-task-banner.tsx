import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = { task: { id: string; name: string; mine: boolean } };

export default function OpenTaskBanner({ task }: Props) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
			<div>
				<p className="font-medium">
					{task.mine
						? "Ai o sarcină deschisă pe acest caz"
						: "O sarcină liberă așteaptă pe acest caz"}
				</p>
				<p className="text-sm text-muted-foreground">{task.name}</p>
			</div>
			<Button asChild>
				<Link href={`/tasks/${task.id}`}>
					{task.mine ? "Deschide sarcina" : "Vezi și preia"}
					<ArrowRight />
				</Link>
			</Button>
		</div>
	);
}
