import { Search, TriangleAlert } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import Pagination from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { domainProblem } from "@/lib/cases/domains";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/pagination";
import { AddDomainRow, BulkAddDialog, DomainRow } from "./domain-controls";

export type DupInfo = { number: number; stage: string; own: boolean };

type Props = {
	number: number;
	rows: { id: string; position: number; value: string }[];
	duplicates: Record<string, DupInfo[]>;
	q: string;
	page: number;
	size: number;
	onlyInvalid: boolean;
	basePath: string;
};

export default function EditableDomainsTable({
	number,
	rows,
	duplicates,
	q,
	page,
	size,
	onlyInvalid,
	basePath,
}: Props) {
	const withProblems = rows.map((r) => ({
		...r,
		problem: domainProblem(r.value),
		dups: duplicates[r.value] ?? [],
	}));
	const isBad = (r: { problem: string | null; dups: DupInfo[] }) =>
		Boolean(r.problem) || r.dups.length > 0;
	const invalidCount = withProblems.filter(isBad).length;
	const dupCount = withProblems.filter((r) => r.dups.length > 0).length;

	const needle = q.toLowerCase();
	const filtered = withProblems.filter(
		(r) => (!needle || r.value.includes(needle)) && (!onlyInvalid || isBad(r)),
	);
	const total = filtered.length;
	const pages = Math.max(1, Math.ceil(total / size));
	const current = Math.min(Math.max(1, page), pages);
	const pageRows = filtered.slice((current - 1) * size, current * size);

	const href = (p: number, s = size, invalidOnly = onlyInvalid) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (invalidOnly) params.set("problems", "1");
		if (s !== DEFAULT_PAGE_SIZE) params.set("size", String(s));
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return qs ? `${basePath}?${qs}` : basePath;
	};

	const filtering = Boolean(q) || onlyInvalid;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-col gap-1">
						<CardTitle>Domenii</CardTitle>
						<CardDescription>
							{filtering
								? `${total} rezultate din ${rows.length} domenii`
								: `${rows.length} domenii în listă`}
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Form action={basePath} className="flex gap-2">
							{onlyInvalid && <input type="hidden" name="problems" value="1" />}
							{size !== DEFAULT_PAGE_SIZE && (
								<input type="hidden" name="size" value={size} />
							)}
							<div className="relative">
								<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									name="q"
									defaultValue={q}
									placeholder="Caută domeniu"
									className="w-48 pl-8"
								/>
							</div>
							<Button type="submit" variant="outline">
								Caută
							</Button>
						</Form>
						<BulkAddDialog number={number} />
					</div>
				</div>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				{invalidCount > 0 && (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
						<p className="flex items-center gap-2 text-destructive">
							<TriangleAlert className="size-4 shrink-0" />
							{invalidCount === 1
								? "Un domeniu are probleme și este marcat cu roșu."
								: `${invalidCount} domenii au probleme și sunt marcate cu roșu.`}{" "}
							{dupCount > 0 &&
								`${dupCount === 1 ? "Unul există" : `${dupCount} există`} deja în alte cazuri. `}
							Corectează-le sau șterge-le înainte să trimiți.
						</p>
						<Button asChild size="sm" variant="outline">
							<Link href={href(1, size, !onlyInvalid)}>
								{onlyInvalid ? "Arată toate" : "Arată doar problemele"}
							</Link>
						</Button>
					</div>
				)}

				<div className="overflow-hidden rounded-lg border">
					<Table className="table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-20">Nr.</TableHead>
								<TableHead>Domeniu</TableHead>
								<TableHead className="w-28" />
							</TableRow>
						</TableHeader>
						<TableBody>
							<AddDomainRow number={number} />
							{pageRows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3}
										className="h-20 text-center text-muted-foreground"
									>
										{filtering
											? "Niciun domeniu pentru filtrele alese"
											: "Lista este goală. Adaugă primul domeniu mai sus sau lipește o listă."}
									</TableCell>
								</TableRow>
							) : (
								pageRows.map((r) => (
									<DomainRow key={r.id} number={number} row={r} />
								))
							)}
						</TableBody>
					</Table>
				</div>

				<Pagination
					page={current}
					pages={pages}
					total={total}
					size={size}
					sizes={PAGE_SIZES}
					href={(p, s) => href(p, s)}
					basePath={basePath}
					extra={{
						...(q ? { q } : {}),
						...(onlyInvalid ? { problems: "1" } : {}),
					}}
				/>
			</CardContent>
		</Card>
	);
}
