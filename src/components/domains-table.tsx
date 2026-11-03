import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
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
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/pagination";

type Props = {
	domains: { id: string; position: number; value: string }[];
	total: number;
	allTotal: number;
	page: number;
	size: number;
	q: string;
	basePath: string;
};

export default function DomainsTable({
	domains,
	total,
	allTotal,
	page,
	size,
	q,
	basePath,
}: Props) {
	const pages = Math.max(1, Math.ceil(total / size));

	const href = (p: number, s = size) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		if (s !== DEFAULT_PAGE_SIZE) params.set("size", String(s));
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return qs ? `${basePath}?${qs}` : basePath;
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-col gap-1">
						<CardTitle>Domenii</CardTitle>
						<CardDescription>
							{q
								? `${total} rezultate din ${allTotal} domenii`
								: `${allTotal} domenii în listă`}
						</CardDescription>
					</div>
					<Form
						action={basePath}
						className="flex w-full gap-2 sm:w-80"
					>
						{size !== DEFAULT_PAGE_SIZE && (
							<input type="hidden" name="size" value={size} />
						)}
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								name="q"
								defaultValue={q}
								placeholder="Caută domeniu"
								className="pl-8"
							/>
						</div>
						<Button type="submit" variant="outline">
							Caută
						</Button>
						{q && (
							<Button asChild variant="ghost">
								<Link
									href={
										size !== DEFAULT_PAGE_SIZE
											? `${basePath}?size=${size}`
											: basePath
									}
								>
									Șterge
								</Link>
							</Button>
						)}
					</Form>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="overflow-hidden rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-20">Nr.</TableHead>
								<TableHead>Domeniu</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{domains.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={2}
										className="h-24 text-center text-muted-foreground"
									>
										{q
											? `Niciun domeniu pentru „${q}”`
											: "Lista este goală"}
									</TableCell>
								</TableRow>
							) : (
								domains.map((d) => (
									<TableRow key={d.id}>
										<TableCell className="text-muted-foreground tabular-nums">
											{d.position}
										</TableCell>
										<TableCell className="font-mono text-sm">
											{d.value}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				<Pagination
					page={page}
					pages={pages}
					total={total}
					size={size}
					sizes={PAGE_SIZES}
					href={href}
					basePath={basePath}
					extra={q ? { q } : {}}
				/>
			</CardContent>
		</Card>
	);
}
