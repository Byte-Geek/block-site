import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { TimelineBranch, TimelineEvent } from "@/lib/cases/case-history";
import Timeline from "./timeline";

type Props = {
	events: TimelineEvent[];
	branches?: TimelineBranch[];
};

export default function HistoryTab({ events, branches }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Istoric</CardTitle>
				<CardDescription>
					Evoluția cazului, deciziile luate și răspunsurile furnizorilor de
					internet.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Timeline events={events} branches={branches} />
			</CardContent>
		</Card>
	);
}
