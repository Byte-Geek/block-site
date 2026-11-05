import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

type Props = {
	number: number;
	notes: { id: string; userId: string; text: string; createdAt: Date }[];
	nameOf: (userId: string) => string;
};

export default function NotesPreview({ number, notes, nameOf }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Comentarii</CardTitle>
				<CardDescription>
					{notes.length === 0
						? "Niciun comentariu încă."
						: `${notes.length} ${notes.length === 1 ? "comentariu" : "comentarii"}`}{" "}
					<Link
						href={`/cases/${number}?tab=comentarii`}
						className="font-medium text-primary hover:underline"
					>
						{notes.length === 0 ? "Scrie unul" : "Deschide și scrie"}
					</Link>
				</CardDescription>
			</CardHeader>
			{notes.length > 0 && (
				<CardContent>
					<ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
						{notes.map((n) => (
							<li key={n.id} className="flex flex-col gap-1 p-3 text-sm">
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-foreground">
										{nameOf(n.userId)}
									</span>
									{" · "}
									{formatDateTime(n.createdAt)}
								</p>
								<p className="break-words whitespace-pre-wrap">{n.text}</p>
							</li>
						))}
					</ul>
				</CardContent>
			)}
		</Card>
	);
}
