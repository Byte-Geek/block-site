import {
	ArrowRight,
	Bell,
	FilePlus2,
	FolderCheck,
	FolderOpen,
	TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import DomainSearch from "@/components/cases/domain-search";
import RecentCases from "@/components/cases/recent-cases";
import StatCard from "@/components/common/stat-card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { countByStage } from "@/lib/cases/stats";
import { prisma } from "@/lib/prisma";

type Props = { user: { id: string; name: string }; d: string };

export default async function InitiatorDashboard({ user, d }: Props) {
	const mine = { createdById: user.id };

	const [stages, rejected, recent, drafts, unread] = await Promise.all([
		countByStage(mine),
		prisma.case.findMany({
			where: { ...mine, stage: "initiator" },
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
			where: mine,
			orderBy: { number: "desc" },
			take: 5,
		}),
		prisma.case.findMany({
			where: { ...mine, stage: "draft" },
			orderBy: { number: "desc" },
			take: 5,
			include: { _count: { select: { domains: true } } },
		}),
		prisma.notification.count({ where: { userId: user.id, readAt: null } }),
	]);

	const toFix = stages.of("initiator");
	const inProgress = stages.of("asp") + stages.of("anr") + stages.of("isp");

	return (
		<PageShell>
			<PageHeader
				title={`Bună, ${user.name.split(" ")[0]}`}
				description="Încarcă liste noi și urmărește cazurile tale."
			/>

			<DomainSearch d={d} />

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
					value={stages.of("closed")}
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
							<CaseListItem
								key={c.id}
								number={c.number}
								fileName={c.fileName}
								detail={`${c._count.domains} domenii, netrimisă`}
								action="Continuă"
								variant="outline"
							/>
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
								<CaseListItem
									key={c.id}
									number={c.number}
									fileName={c.fileName}
									detail={
										r
											? `Respins de ${r.stage === "asp" ? "ASP" : "ANRCETI"}${r.text ? `: ${r.text}` : ""}`
											: "Respins"
									}
									action="Corectează"
									variant="default"
								/>
							);
						})}
					</ul>
				</section>
			)}

			<RecentCases
				title="Cazurile mele recente"
				empty="Nu ai încă niciun caz. Începe cu „Încarcă lista”."
				cases={recent}
			/>
		</PageShell>
	);
}

type ItemProps = {
	number: number;
	fileName: string;
	detail: string;
	action: string;
	variant: "default" | "outline";
};

function CaseListItem({
	number,
	fileName,
	detail,
	action,
	variant,
}: ItemProps) {
	return (
		<li className="flex flex-wrap items-center justify-between gap-3 p-4">
			<div className="min-w-0">
				<p className="font-medium">
					Caz #{number}{" "}
					<span className="font-normal text-muted-foreground">
						· {fileName}
					</span>
				</p>
				<p className="text-sm text-muted-foreground">{detail}</p>
			</div>
			<Button asChild size="sm" variant={variant}>
				<Link href={`/cases/${number}`}>
					{action}
					<ArrowRight />
				</Link>
			</Button>
		</li>
	);
}
