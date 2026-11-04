import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StageBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

type Props = {
	title: string;
	empty: string;
	cases: {
		id: string;
		number: number;
		fileName: string;
		stage: string;
		createdAt: Date;
	}[];
};

export default function RecentCases({ title, empty, cases }: Props) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{title}</h2>
				{cases.length > 0 && (
					<Button asChild variant="ghost" size="sm">
						<Link href="/cases">
							Vezi toate
							<ArrowRight />
						</Link>
					</Button>
				)}
			</div>

			{cases.length === 0 ? (
				<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
					{empty}
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Caz</TableHead>
								<TableHead className="hidden md:table-cell">Fișier</TableHead>
								<TableHead>Etapă</TableHead>
								<TableHead className="hidden md:table-cell">Încărcat</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cases.map((c) => (
								<TableRow key={c.id}>
									<TableCell className="font-medium">
										<Link
											href={`/cases/${c.number}`}
											className="hover:underline"
										>
											#{c.number}
										</Link>
									</TableCell>
									<TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
										{c.fileName}
									</TableCell>
									<TableCell>
										<StageBadge stage={c.stage} />
									</TableCell>
									<TableCell className="hidden text-muted-foreground md:table-cell">
										{formatDate(c.createdAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</section>
	);
}
