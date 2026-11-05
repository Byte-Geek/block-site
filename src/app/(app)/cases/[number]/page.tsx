import { notFound } from "next/navigation";
import DomainsTable from "@/components/cases/domains-table";
import FlashToast from "@/components/common/flash-toast";
import { StageBadge } from "@/components/common/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import {
	buildEvents,
	buildIspParticipants,
	latestRejection,
} from "@/lib/cases/case-history";
import { parseCaseNumber } from "@/lib/cases/case-number";
import { getCaseReport } from "@/lib/cases/case-report";
import { EDITABLE_STAGES } from "@/lib/cases/constants";
import { getDomainsPage, getEditableDomains } from "@/lib/cases/domain-queries";
import { taskKeys } from "@/lib/flowable/task-keys";
import { findOpenTask, listCaseTasks } from "@/lib/flowable/tasks";
import { formatDateTime } from "@/lib/format";
import { pageSizeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireCaseAccess } from "@/lib/rbac/case-access";
import { can } from "@/lib/rbac/permissions";
import CaseDetailsCard from "./_components/case-details-card";
import CaseReport from "./_components/case-report";
import CaseStatusPanel from "./_components/case-status-panel";
import CaseTabs, { type CaseTab } from "./_components/case-tabs";
import CaseTasksCard from "./_components/case-tasks-card";
import EditableDomainsTable from "./_components/editable-domains-table";
import FilesTab from "./_components/files-tab";
import HistoryTab from "./_components/history-tab";
import IspStatusCard from "./_components/isp-status-card";
import NotesTab from "./_components/notes-tab";
import OpenTaskBanner from "./_components/open-task-banner";

type Props = {
	params: Promise<{ number: string }>;
	searchParams: Promise<{
		page?: string;
		q?: string;
		size?: string;
		ok?: string;
		problems?: string;
		dup?: string;
		col?: string;
		tab?: string;
	}>;
};

const TABS: CaseTab[] = [
	"raport",
	"descriere",
	"istoric",
	"comentarii",
	"fisiere",
];

export default async function CasePage({ params, searchParams }: Props) {
	const number = parseCaseNumber((await params).number);
	if (!number) notFound();
	const {
		page = "1",
		q = "",
		size: sizeParam,
		ok,
		problems,
		dup,
		col,
		tab: tabParam,
	} = await searchParams;
	const requestedTab = TABS.find((t) => t === tabParam);

	const { user, access } = await requireCaseAccess();

	const c = await prisma.case.findFirst({
		where: { AND: [access.where, { number }] },
		include: {
			comments: true,
			ispResponses: true,
			_count: { select: { domains: true, notes: true, files: true } },
		},
	});
	if (!c) notFound();

	const isInitiator = can(user.role, "case", "create");
	const isEditable = isInitiator && EDITABLE_STAGES.includes(c.stage);
	const isOpen = c.stage !== "cancelled";
	const showTasks = can(user.role, "case", "readAll");
	const caseTasks = showTasks ? await listCaseTasks(c.processInstanceId) : [];

	const notes =
		requestedTab === "comentarii"
			? await prisma.caseNote.findMany({
					where: { caseId: c.id },
					orderBy: { createdAt: "asc" },
				})
			: [];
	const files =
		requestedTab === "fisiere"
			? await prisma.caseFile.findMany({
					where: { caseId: c.id },
					orderBy: { createdAt: "asc" },
				})
			: [];

	const userIds = [
		c.createdById,
		...notes.map((x) => x.userId),
		...files.map((x) => x.userId),
		...c.comments.map((x) => x.userId),
		...c.ispResponses.map((x) => x.userId),
		...caseTasks.flatMap((t) =>
			[t.assignee, t.candidateUser].filter((v): v is string => Boolean(v)),
		),
	];
	const [users, openTask] = await Promise.all([
		prisma.user.findMany({ where: { id: { in: userIds } } }),
		findOpenTask(user, c.processInstanceId),
	]);
	const names = new Map<string, string>(users.map((u) => [u.id, u.name]));
	const nameOf = (id: string) => names.get(id) ?? id;

	const caseData = { ...c, domainCount: c._count.domains };
	const events = buildEvents(caseData, nameOf);
	const { items: ispItems, branches } = buildIspParticipants(
		caseData,
		caseTasks,
		nameOf,
	);

	const report =
		c.stage === "closed" && ispItems.length > 0
			? await getCaseReport(c.id, ispItems, c._count.domains)
			: null;

	const tab: CaseTab =
		requestedTab === "raport" && !report
			? "descriere"
			: (requestedTab ?? (report ? "raport" : "descriere"));

	const editable = isEditable ? await getEditableDomains(c.id, user.id) : null;
	const domainsPage = isEditable
		? null
		: await getDomainsPage(c.id, {
				q,
				page,
				size: pageSizeFrom(sizeParam),
			});

	const taskRows = caseTasks.map((t) => ({
		id: t.id,
		name: t.name,
		status: t.assignee
			? `Preluată de ${nameOf(t.assignee)}`
			: t.taskDefinitionKey === taskKeys.initiator
				? "Așteaptă inițiatorul să retrimită lista"
				: t.candidateUser
					? `Liberă, așteaptă ${nameOf(t.candidateUser)}`
					: "Liberă, o poate prelua orice membru al grupului",
		assigneeName: t.assignee ? nameOf(t.assignee) : null,
	}));

	const flashDetail =
		[
			col && /^[A-Z]{1,3}$/.test(col)
				? `Domeniile au fost citite din coloana ${col}.`
				: null,
			Number(dup) > 0 ? `${dup} duplicate au fost eliminate.` : null,
		]
			.filter(Boolean)
			.join(" ") || undefined;

	const basePath = `/cases/${c.number}`;

	return (
		<PageShell>
			<FlashToast ok={ok} detail={flashDetail} />

			<PageHeader
				back={{ href: "/cases", label: "Cazuri" }}
				title={`Caz #${c.number}`}
				description={
					c.stage === "draft"
						? "Ciornă, încă netrimisă"
						: `Încărcat ${formatDateTime(c.createdAt)}`
				}
				actions={<StageBadge stage={c.stage} />}
			/>

			{openTask && <OpenTaskBanner task={openTask} />}

			<CaseTabs
				basePath={basePath}
				active={tab}
				hasReport={Boolean(report)}
				counts={{ comentarii: c._count.notes, fisiere: c._count.files }}
			/>

			{tab === "raport" && report && (
				<CaseReport
					total={c._count.domains}
					blockedByAll={report.blockedByAll}
					ispCount={ispItems.length}
					failures={report.failures}
				/>
			)}

			{tab === "istoric" && <HistoryTab events={events} branches={branches} />}

			{tab === "comentarii" && (
				<NotesTab
					number={c.number}
					canWrite={isOpen && can(user.role, "note", "create")}
					notes={notes}
					nameOf={nameOf}
				/>
			)}

			{tab === "fisiere" && (
				<FilesTab
					number={c.number}
					canWrite={isOpen && can(user.role, "file", "upload")}
					files={files}
					nameOf={nameOf}
				/>
			)}

			{tab === "descriere" && (
				<>
					<CaseStatusPanel
						stage={c.stage}
						isInitiator={isInitiator}
						number={c.number}
						domainCount={c._count.domains}
						invalidCount={editable?.invalidCount ?? 0}
						rejection={isInitiator ? latestRejection(c.comments) : null}
					/>

					<div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
						<div className="min-w-0">
							{editable ? (
								<EditableDomainsTable
									number={c.number}
									rows={editable.rows}
									duplicates={editable.duplicates}
									q={q}
									page={Number(page) || 1}
									size={pageSizeFrom(sizeParam)}
									onlyInvalid={problems === "1"}
									basePath={basePath}
								/>
							) : (
								domainsPage && (
									<DomainsTable {...domainsPage} q={q} basePath={basePath} />
								)
							)}
						</div>

						<div className="order-first flex flex-col gap-6 lg:order-last">
							<CaseDetailsCard
								initiator={nameOf(c.createdById)}
								fileName={c.fileName}
								domainCount={c._count.domains}
							/>

							{taskRows.length > 0 && (
								<CaseTasksCard
									rows={taskRows}
									canRelease={can(user.role, "task", "release")}
								/>
							)}

							{ispItems.length > 0 && (
								<IspStatusCard items={ispItems} closed={c.stage === "closed"} />
							)}
						</div>
					</div>
				</>
			)}
		</PageShell>
	);
}
