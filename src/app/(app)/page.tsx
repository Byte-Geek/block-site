import Link from "next/link";
import {
	ArrowRight,
	Bell,
	FolderCheck,
	FolderOpen,
	HandHelping,
	ListChecks,
	Plus,
	Users,
	UsersRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { caseAccess } from "@/lib/case-access";
import { requireUser } from "@/lib/current-user";
import { formatDate } from "@/lib/format";
import { listTasksForUser } from "@/lib/task-access";
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
import InitiatorDashboard from "./initiator-dashboard";

const roleText: Record<string, string> = {
	initiator: "Încarcă liste noi și urmărește cazurile tale.",
	asp: "Validează listele care ajung la ASP.",
	anr: "Validează listele aprobate de ASP.",
	isp: "Execută blocările din cazurile aprobate.",
};

const availableHint: Record<string, string> = {
	asp: "Libere în grupul tău, de preluat",
	anr: "Libere în grupul tău, de preluat",
	isp: "Noi, încă nepreluate",
};

export default async function HomePage() {
	const user = await requireUser();
	const isAdmin = user.role === "admin";
	const access = caseAccess(user);

	if (!access) {
		return (
			<PageShell className="max-w-3xl">
				<PageHeader
					title="Contul nu are încă un grup"
					description="Cere administratorului să te adauge într-un grup ca să poți lucra în platformă."
				/>
			</PageShell>
		);
	}

	const isInitiator = access.group === "initiator";
	if (isInitiator)
		return <InitiatorDashboard userId={user.id} name={user.name} />;

	const [stageCounts, recent, tasks, unread, users, groups] = await Promise.all(
		[
			prisma.case.groupBy({
				by: ["stage"],
				where: access.where,
				_count: { _all: true },
			}),
			prisma.case.findMany({
				where: access.where,
				orderBy: { number: "desc" },
				take: 5,
				include: { _count: { select: { domains: true } } },
			}),
			isAdmin || isInitiator
				? null
				: listTasksForUser(user).catch((e) => {
						console.error("HOME TASKS:", e);
						return null;
					}),
			isAdmin
				? null
				: prisma.notification.count({
						where: { userId: user.id, readAt: null },
					}),
			isAdmin ? prisma.user.count() : null,
			isAdmin ? prisma.group.count() : null,
		],
	);

	const countOf = (s: string) =>
		stageCounts.find((x) => x.stage === s)?._count._all ?? 0;
	const total = stageCounts.reduce((sum, x) => sum + x._count._all, 0);
	const closed = countOf("closed");
	const inProgress = total - closed;
	const openTasks = isInitiator ? countOf("initiator") : null;
	const mineCount = tasks ? tasks.mine.length : null;
	const availableCount = tasks ? tasks.available.length : null;

	const cards = isAdmin
		? [
				{
					href: "/cases",
					label: "Cazuri în curs",
					value: inProgress,
					icon: FolderOpen,
				},
				{
					href: "/cases?stage=closed",
					label: "Cazuri închise",
					value: closed,
					icon: FolderCheck,
				},
				{
					href: "/admin/users",
					label: "Utilizatori",
					value: users,
					icon: Users,
				},
				{
					href: "/admin/groups",
					label: "Grupuri",
					value: groups,
					icon: UsersRound,
				},
			]
		: isInitiator
			? [
					{
						href: "/tasks",
						label: "Sarcini deschise",
						value: openTasks,
						icon: ListChecks,
						hint: "Liste respinse, de retrimis",
						highlight: (openTasks ?? 0) > 0,
					},
					{
						href: "/cases",
						label: "Cazuri în curs",
						value: inProgress,
						icon: FolderOpen,
					},
					{
						href: "/cases?stage=closed",
						label: "Cazuri închise",
						value: closed,
						icon: FolderCheck,
					},
					{
						href: "/notifications",
						label: "Notificări necitite",
						value: unread,
						icon: Bell,
					},
				]
			: [
					{
						href: "/tasks?tab=mine",
						label: "Ale mele",
						value: mineCount,
						icon: ListChecks,
						hint: "Preluate de tine, de rezolvat",
						highlight: (mineCount ?? 0) > 0,
					},
					{
						href: "/tasks?tab=available",
						label: "Disponibile",
						value: availableCount,
						icon: HandHelping,
						hint: access.group ? availableHint[access.group] : undefined,
					},
					{
						href: "/cases",
						label: "Cazuri în curs",
						value: inProgress,
						icon: FolderOpen,
					},
					{
						href: "/notifications",
						label: "Notificări necitite",
						value: unread,
						icon: Bell,
					},
				];

	return (
		<PageShell>
			<PageHeader
				title={`Bună, ${user.name.split(" ")[0]}`}
				description={
					isAdmin
						? "Administrează utilizatorii, grupurile și schema procesului."
						: access.group
							? roleText[access.group]
							: undefined
				}
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

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map((card) => (
					<StatCard key={card.href} {...card} />
				))}
			</div>

			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Cazuri recente</h2>
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
						Nu există cazuri încă.
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
