import {
	ArrowRight,
	Bell,
	FilePlus2,
	FolderCheck,
	FolderOpen,
	TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";
import StatCard from "@/components/stat-card";
import { StageBadge } from "@/components/status-badge";
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
import { prisma } from "@/lib/prisma";

type Props = { userId: string; name: string };

export default async function InitiatorDashboard({ userId, name }: Props) {
	const where = { createdById: userId };

	const [stageCounts, rejected, recent, drafts, unread] = await Promise.all([
		prisma.case.groupBy({
			by: ["stage"],
			where,
			_count: { _all: true },
		}),
		prisma.case.findMany({
			where: { ...where, stage: "initiator" },
			orderBy: { number: "desc" },
			take: 5,
			include: {
				comments: {
					where: { decision: "nu" },
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		}),
		prisma.case.findMany({
			where,
			orderBy: { number: "desc" },
			take: 5,
		}),
		prisma.case.findMany({
			where: { ...where, stage: "draft" },
			orderBy: { number: "desc" },
			take: 5,
			include: { _count: { select: { domains: true } } },
		}),
		prisma.notification.count({ where: { userId, readAt: null } }),
	]);

	const countOf = (s: string) =>
		stageCounts.find((x) => x.stage === s)?._count._all ?? 0;
	const toFix = countOf("initiator");
	const inProgress = countOf("asp") + countOf("anr") + countOf("isp");
	const closed = countOf("closed");

	return (
		<PageShell>
			<PageHeader
				title={`Bună, ${name.split(" ")[0]}`}
				description="Încarcă liste noi și urmărește cazurile tale."
			/>

			<div className="flex flex-col gap-4 rounded-xl border bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-4">
					<div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
						<FilePlus2 className="size-5" />
					</div>
					<div>
						<h2 className="text-lg font-semibold">Începe un caz nou</h2>
						<p className="text-sm text-muted-foreground">
							Încarcă lista de domenii pentru blocare. Cazul pornește automat la
							validarea ASP.
						</p>
					</div>
				</div>
				<Button asChild size="lg">
					<Link href="/cases/new">
						Încarcă lista
						<ArrowRight />
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					href="/cases?stage=initiator"
					label="De corectat"
					value={toFix}
					icon={TriangleAlert}
					hint="Respinse, așteaptă lista corectată"
					highlight={toFix > 0}
				/>
				<StatCard
					href="/cases"
					label="Cazuri în curs"
					value={inProgress}
					icon={FolderOpen}
				/>
				<StatCard
					href="/cases?stage=closed"
					label="Cazuri închise"
					value={closed}
					icon={FolderCheck}
				/>
				<StatCard
					href="/notifications"
					label="Notificări necitite"
					value={unread}
					icon={Bell}
				/>
			</div>

			{drafts.length > 0 && (
				<section className="flex flex-col gap-3">
					<h2 className="text-lg font-semibold">Ciorne</h2>
					<ul className="divide-y overflow-hidden rounded-xl border bg-card">
						{drafts.map((c) => (
							<li
								key={c.id}
								className="flex flex-wrap items-center justify-between gap-3 p-4"
							>
								<div className="min-w-0">
									<p className="font-medium">
										Caz #{c.number}{" "}
										<span className="font-normal text-muted-foreground">
											· {c.fileName}
										</span>
									</p>
									<p className="text-sm text-muted-foreground">
										{c._count.domains} domenii, netrimisă
									</p>
								</div>
								<Button asChild size="sm" variant="outline">
									<Link href={`/cases/${c.number}`}>
										Continuă
										<ArrowRight />
									</Link>
								</Button>
							</li>
						))}
					</ul>
				</section>
			)}

			{rejected.length > 0 && (
				<section className="flex flex-col gap-3">
					<h2 className="flex items-center gap-2 text-lg font-semibold">
						<TriangleAlert className="size-5 text-amber-600" />
						De corectat
					</h2>
					<ul className="divide-y overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50">
						{rejected.map((c) => {
							const r = c.comments[0];
							return (
								<li
									key={c.id}
									className="flex flex-wrap items-center justify-between gap-3 p-4"
								>
									<div className="min-w-0">
										<p className="font-medium">
											Caz #{c.number}{" "}
											<span className="font-normal text-muted-foreground">
												· {c.fileName}
											</span>
										</p>
										<p className="text-sm text-muted-foreground">
											{r
												? `Respins de ${r.stage === "asp" ? "ASP" : "ANRCETI"}${r.text ? `: ${r.text}` : ""}`
												: "Respins"}
										</p>
									</div>
									<Button asChild size="sm">
										<Link href={`/cases/${c.number}`}>
											Corectează
											<ArrowRight />
										</Link>
									</Button>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Cazurile mele recente</h2>
					{recent.length > 0 && (
						<Button asChild variant="ghost" size="sm">
							<Link href="/cases">
								Vezi toate
								<ArrowRight />
							</Link>
						</Button>
					)}
				</div>

				{recent.length === 0 ? (
					<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
						Nu ai încă niciun caz. Începe cu „Încarcă lista”.
					</div>
				) : (
					<div className="overflow-hidden rounded-xl border bg-card">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Caz</TableHead>
									<TableHead className="hidden md:table-cell">Fișier</TableHead>
									<TableHead>Etapă</TableHead>
									<TableHead className="hidden md:table-cell">
										Încărcat
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recent.map((c) => (
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
		</PageShell>
	);
}
