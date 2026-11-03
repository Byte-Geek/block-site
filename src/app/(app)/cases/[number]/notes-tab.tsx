import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import NoteForm from "./note-form";

type Props = {
	number: number;
	canWrite: boolean;
	notes: { id: string; userId: string; text: string; createdAt: Date }[];
	nameOf: (id: string) => string;
};

export default function NotesTab({ number, canWrite, notes, nameOf }: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Comentarii</CardTitle>
				<CardDescription>
					{notes.length === 0
						? "Niciun comentariu încă."
						: `${notes.length} ${notes.length === 1 ? "comentariu" : "comentarii"}`}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{notes.length > 0 && (
					<ul className="divide-y rounded-lg border">
						{notes.map((n) => (
							<li
								key={n.id}
								className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4"
							>
								<div className="text-sm">
									<p className="font-medium wrap-break-word">
										{nameOf(n.userId)}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatDateTime(n.createdAt)}
									</p>
								</div>
								<p className="text-sm wrap-break-word whitespace-pre-wrap">
									{n.text}
								</p>
							</li>
						))}
					</ul>
				)}
				{canWrite && <NoteForm number={number} />}
			</CardContent>
		</Card>
	);
}
