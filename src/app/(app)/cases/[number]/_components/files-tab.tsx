import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatSize } from "@/lib/format";
import AttachmentUploadForm from "./attachment-upload-form";

type Props = {
	number: number;
	canWrite: boolean;
	files: {
		id: string;
		userId: string;
		name: string;
		note: string | null;
		size: number;
		kind: string;
		createdAt: Date;
	}[];
	nameOf: (id: string) => string;
};

export default function FilesTab({ number, canWrite, files, nameOf }: Props) {
	const firstList = files.find((f) => f.kind === "list")?.id;
	const rows = files.map((f) => ({
		...f,
		label:
			f.kind !== "list"
				? "Document"
				: f.id === firstList
					? "Lista inițială"
					: "Listă corectată",
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Fișiere</CardTitle>
				<CardDescription>
					{files.length === 0
						? "Niciun fișier încă."
						: "În ordinea încărcării."}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{canWrite && <AttachmentUploadForm number={number} />}

				{rows.length > 0 && (
					<div className="overflow-hidden rounded-lg border">
						<Table className="table-fixed">
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">Nr.</TableHead>
									<TableHead>Fișier</TableHead>
									<TableHead className="hidden w-32 md:table-cell">
										Tip
									</TableHead>
									<TableHead className="hidden w-24 md:table-cell">
										Mărime
									</TableHead>
									<TableHead className="w-44">Încărcat de</TableHead>
									<TableHead className="w-14" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((f, i) => (
									<TableRow key={f.id}>
										<TableCell className="text-muted-foreground tabular-nums">
											{i + 1}
										</TableCell>
										<TableCell className="whitespace-normal">
											<p className="font-medium break-all">{f.name}</p>
											{f.note && (
												<p className="text-xs break-words text-muted-foreground">
													{f.note}
												</p>
											)}
										</TableCell>
										<TableCell className="hidden md:table-cell">
											{f.label}
										</TableCell>
										<TableCell className="hidden tabular-nums md:table-cell">
											{formatSize(f.size)}
										</TableCell>
										<TableCell className="whitespace-normal">
											<p className="break-words">{nameOf(f.userId)}</p>
											<p className="text-xs text-muted-foreground">
												{formatDateTime(f.createdAt)}
											</p>
										</TableCell>
										<TableCell>
											<Button
												asChild
												size="icon"
												variant="ghost"
												aria-label={`Descarcă ${f.name}`}
											>
												<a href={`/api/files/${f.id}`}>
													<Download />
												</a>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
