import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import CaseReport from "@/components/cases/case-report";
import CaseTabs, { type CaseTab } from "@/components/cases/case-tabs";
import DomainsTable from "@/components/cases/domains-table";
import IspStatusCard from "@/components/cases/isp-status-card";
import Timeline from "@/components/cases/timeline";
import FlashToast from "@/components/common/flash-toast";
import { StageBadge } from "@/components/common/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCaseAccess } from "@/lib/cases/access";
import { getDomainsPage } from "@/lib/cases/domain-page";
import { domainProblem } from "@/lib/cases/domains";
import { duplicatesByDomain } from "@/lib/cases/duplicates";
import { parseCaseNumber } from "@/lib/cases/number";
import { formatDateTime } from "@/lib/format";
import { pageSizeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { findOpenTask, listCaseTasks } from "@/lib/workflow/tasks";
import CaseDetailsCard from "./_components/case-details-card";
import CaseStatusPanel from "./_components/case-status-panel";
import CaseTasksCard from "./_components/case-tasks-card";
import EditableDomainsTable from "./_components/editable-domains-table";
import FilesTab from "./_components/files-tab";
import NotesTab from "./_components/notes-tab";
import OpenTaskBanner from "./_components/open-task-banner";
import {
	buildEvents,
	buildIspParticipants,
	latestRejection,
} from "./_actions/history";
import { getCaseReport } from "./_actions/report";

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

const TABS: CaseTab[] = ["raport", "descriere", "comentarii", "fisiere"];

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

	const isInitiator = access.group === "initiator";
	const isAdmin = user.role === "admin";
	const isEditable =
		isInitiator && (c.stage === "draft" || c.stage === "initiator");
	const showTasks =
		isAdmin || access.group === "asp" || access.group === "anr";
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
			[t.assignee, t.candidateUser].filter((v): v is string =>
				Boolean(v),
			),
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

	const editable = isEditable
		? await (async () => {
				const rows = await prisma.caseDomain.findMany({
					where: { caseId: c.id },
					orderBy: { position: "asc" },
					select: { id: true, position: true, value: true },
				});
				const duplicates = await duplicatesByDomain(c.id, user.id);
				const invalidCount = rows.filter(
					(r) => domainProblem(r.value) || duplicates[r.value],
				).length;
				return { rows, duplicates, invalidCount };
			})()
		: null;
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
			: t.taskDefinitionKey === "trimitere"
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
	const isDraft = isInitiator && c.stage === "draft";
	const historyCard = !isDraft && (
		<Card>
			<CardHeader>
				<CardTitle>Istoric</CardTitle>
			</CardHeader>
			<CardContent>
				<Timeline events={events} branches={branches} />
			</CardContent>
		</Card>
	);

	return (
		<PageShell>
			<FlashToast ok={ok} detail={flashDetail} />

			<PageHeader
				back={
					<Button
						asChild
						variant="ghost"
						size="sm"
						className="-ml-2 w-fit"
					>
						<Link href="/cases">
							<ChevronLeft />
							Cazuri
						</Link>
					</Button>
				}
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

			{tab === "comentarii" && (
				<NotesTab
					number={c.number}
					canWrite={c.stage !== "cancelled"}
					notes={notes}
					nameOf={nameOf}
				/>
			)}

			{tab === "fisiere" && (
				<FilesTab
					number={c.number}
					canWrite={c.stage !== "cancelled"}
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
						rejection={
							isInitiator ? latestRejection(c.comments) : null
						}
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
									<DomainsTable
										{...domainsPage}
										q={q}
										basePath={basePath}
									/>
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
									canRelease={isAdmin}
								/>
							)}

							{ispItems.length > 0 && (
								<IspStatusCard
									items={ispItems}
									closed={c.stage === "closed"}
								/>
							)}

							{!branches.length && historyCard}
						</div>
					</div>

					{branches.length > 0 && historyCard}
				</>
			)}
		</PageShell>
	);
}
