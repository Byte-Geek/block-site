import {
	Bell,
	FolderCheck,
	FolderOpen,
	HandHelping,
	ListChecks,
	Users,
	UsersRound,
} from "lucide-react";
import DomainSearch from "@/components/cases/domain-search";
import RecentCases from "@/components/cases/recent-cases";
import StatCard from "@/components/common/stat-card";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/current-user";
import { caseAccess } from "@/lib/cases/access";
import { countByStage } from "@/lib/cases/stats";
import { prisma } from "@/lib/prisma";
import { listTasksForUser } from "@/lib/workflow/tasks";
import InitiatorDashboard from "./_components/initiator-dashboard";

const roleText: Record<string, string> = {
	asp: "Validează listele care ajung la ASP.",
	anr: "Validează listele aprobate de ASP.",
	isp: "Execută blocările din cazurile aprobate.",
};

const availableHint: Record<string, string> = {
	asp: "Libere în grupul tău, de preluat",
	anr: "Libere în grupul tău, de preluat",
	isp: "Noi, încă nepreluate",
};

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ d?: string }>;
}) {
	const { d = "" } = await searchParams;
	const user = await requireUser();
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

	if (access.group === "initiator")
		return <InitiatorDashboard user={user} d={d} />;

	const isAdmin = user.role === "admin";
	const [stages, recent, tasks, unread, users, groups] = await Promise.all([
		countByStage(access.where),
		prisma.case.findMany({
			where: access.where,
			orderBy: { number: "desc" },
			take: 5,
		}),
		isAdmin
			? null
			: listTasksForUser(user).catch((e) => {
					console.error("HOME TASKS:", e);
					return null;
				}),
		isAdmin
			? null
			: prisma.notification.count({ where: { userId: user.id, readAt: null } }),
		isAdmin ? prisma.user.count() : null,
		isAdmin ? prisma.group.count() : null,
	]);

	const closed = stages.of("closed");
	const inProgress = stages.total - closed;
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
			/>

			<DomainSearch d={d} />

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map((card) => (
					<StatCard key={card.href} {...card} />
				))}
			</div>

			<RecentCases
				title="Cazuri recente"
				empty="Nu există cazuri încă."
				cases={recent}
			/>
		</PageShell>
	);
}
