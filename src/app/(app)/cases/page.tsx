import { ArrowRight, FolderOpen, Plus, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import EmptyState from "@/components/common/empty-state";
import FilterPills from "@/components/common/filter-pills";
import FlashToast from "@/components/common/flash-toast";
import Pagination from "@/components/common/pagination";
import { StageBadge } from "@/components/common/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/auth/permissions";
import { requireCaseAccess } from "@/lib/cases/access";
import { stageLabels } from "@/lib/cases/constants";
import { countByStage } from "@/lib/cases/stats";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const SIZE = 20;
const stageOrder = [
	"draft",
	"initiator",
	"asp",
	"anr",
	"isp",
	"closed",
	"cancelled",
];

type Props = {
	searchParams: Promise<{
		stage?: string;
		q?: string;
		page?: string;
		ok?: string;
	}>;
};

export default async function CasesPage({ searchParams }: Props) {
	const { stage = "", q = "", page = "1", ok } = await searchParams;
	const { user, access } = await requireCaseAccess();

	const current = Math.max(1, Number(page) || 1);
	const stageFilter = stageOrder.includes(stage) ? stage : "";
	const query = q.trim();
	const num = /^#?\d{1,9}$/.test(query) ? Number(query.replace("#", "")) : null;

	const searchWhere = {
		AND: [
			access.where,
			...(query
				? [
						{
							OR: [
								{
									fileName: { contains: query, mode: "insensitive" as const },
								},
								...(num !== null ? [{ number: num }] : []),
							],
						},
					]
				: []),
		],
	};
	const where = stageFilter
		? { AND: [searchWhere, { stage: stageFilter }] }
		: searchWhere;

	const [stages, total, cases] = await Promise.all([
		countByStage(searchWhere),
		prisma.case.count({ where }),
		prisma.case.findMany({
			where,
			orderBy: { number: "desc" },
			skip: (current - 1) * SIZE,
			take: SIZE,
			include: { _count: { select: { domains: true } } },
		}),
	]);

	const href = (over: { stage?: string; page?: number }) => {
		const st = over.stage ?? stageFilter;
		const params = new URLSearchParams();
		if (st) params.set("stage", st);
		if (query) params.set("q", query);
		if (over.page && over.page > 1) params.set("page", String(over.page));
		const qs = params.toString();
		return qs ? `/cases?${qs}` : "/cases";
	};

	const pills = [
		{ key: "", label: "Toate", count: stages.total },
		...stageOrder
			.filter((s) => stages.of(s) > 0 || s === stageFilter)
			.map((s) => ({ key: s, label: stageLabels[s], count: stages.of(s) })),
	].map((p) => ({
		...p,
		href: href({ stage: p.key }),
		active: p.key === stageFilter,
	}));

	const filtersActive = Boolean(stageFilter || query);
	const isInitiator = can(user.role, "case", "create");
	const newCaseButton = isInitiator && (
		<Button asChild size="sm" className="mt-2">
			<Link href="/cases/new">
				<Plus />
				Listă nouă
			</Link>
		</Button>
	);

	return (
		<PageShell>
			<FlashToast ok={ok} />
			<PageHeader
				title={isInitiator ? "Cazurile mele" : "Cazuri"}
				description={total === 1 ? "Un caz" : `${total} cazuri`}
				actions={
					isInitiator && (
						<Button asChild>
							<Link href="/cases/new">
								<Plus />
								Listă nouă
							</Link>
						</Button>
					)
				}
			/>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<FilterPills items={pills} />

				<Form action="/cases" className="flex w-full gap-2 sm:w-80">
					{stageFilter && (
						<input type="hidden" name="stage" value={stageFilter} />
					)}
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							name="q"
							defaultValue={query}
							placeholder="Număr sau nume de fișier"
							className="pl-8"
						/>
					</div>
					<Button type="submit" variant="outline">
						Caută
					</Button>
				</Form>
			</div>

			{total === 0 ? (
				<EmptyState
					icon={FolderOpen}
					title={
						filtersActive
							? "Niciun caz pentru filtrele alese"
							: "Nu există cazuri"
					}
					action={
						filtersActive ? (
							<Button asChild variant="outline" size="sm" className="mt-2">
								<Link href="/cases">Resetează filtrele</Link>
							</Button>
						) : (
							newCaseButton
						)
					}
				>
					{filtersActive
						? "Schimbă căutarea sau alege altă etapă."
						: isInitiator
							? "Încarcă prima listă de domenii ca să începi un caz."
							: "Cazurile apar aici când inițiatorul încarcă o listă."}
				</EmptyState>
			) : (
				<div className="flex flex-col gap-4">
					<div className="overflow-hidden rounded-xl border bg-card">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Caz</TableHead>
									<TableHead className="hidden md:table-cell">Fișier</TableHead>
									<TableHead>Domenii</TableHead>
									<TableHead>Etapă</TableHead>
									<TableHead className="hidden md:table-cell">
										Încărcat
									</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{cases.map((c) => {
									const actionable =
										isInitiator &&
										(c.stage === "initiator" || c.stage === "draft");
									return (
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
											<TableCell className="tabular-nums">
												{c._count.domains}
											</TableCell>
											<TableCell>
												<StageBadge stage={c.stage} />
											</TableCell>
											<TableCell className="hidden text-muted-foreground md:table-cell">
												{formatDate(c.createdAt)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													asChild
													size="sm"
													variant={actionable ? "default" : "outline"}
												>
													<Link href={`/cases/${c.number}`}>
														{c.stage === "draft"
															? "Continuă"
															: actionable
																? "Corectează"
																: "Deschide"}
														<ArrowRight />
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
					<Pagination
						page={current}
						pages={Math.max(1, Math.ceil(total / SIZE))}
						total={total}
						size={SIZE}
						href={(p) => href({ page: p })}
					/>
				</div>
			)}
		</PageShell>
	);
}
