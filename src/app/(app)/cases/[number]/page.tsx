import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CaseReport, { type IspFailures } from "@/components/case-report";
import CaseStepper from "@/components/case-stepper";
import CaseTabs, { type CaseTab } from "@/components/case-tabs";
import DomainsTable from "@/components/domains-table";
import FlashToast from "@/components/flash-toast";
import IspStatusCard, { type IspItem } from "@/components/isp-status-card";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ispTones, Pill, StageBadge } from "@/components/status-badge";
import Timeline, {
	type TimelineBranch,
	type TimelineEvent,
} from "@/components/timeline";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { caseAccess } from "@/lib/case-access";
import { finalIspStatuses, ispStatusLabels } from "@/lib/constants";
import { requireUser } from "@/lib/current-user";
import { domainProblem } from "@/lib/domains";
import { findDuplicates, groupDuplicates } from "@/lib/duplicates";
import { formatDateTime } from "@/lib/format";
import { pageSizeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { findOpenTask, listCaseTasks } from "@/lib/task-access";
import CaseTasksCard from "./case-tasks-card";
import DraftActions from "./draft-actions";
import EditableDomainsTable from "./editable-domains-table";
import FilesTab from "./files-tab";
import NotesTab from "./notes-tab";
import RejectedActions from "./rejected-actions";

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

export default async function CasePage({ params, searchParams }: Props) {
	const n = Number((await params).number);
	if (!Number.isInteger(n) || n < 1 || n > 2147483647) notFound();
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
	const tab: CaseTab =
		tabParam === "raport" ||
		tabParam === "comentarii" ||
		tabParam === "fisiere"
			? tabParam
			: "descriere";

	const user = await requireUser();
	const access = caseAccess(user);
	if (!access) redirect("/");

	const c = await prisma.case.findFirst({
		where: { AND: [access.where, { number: n }] },
		include: {
			comments: true,
			ispResponses: true,
			_count: { select: { domains: true, notes: true, files: true } },
		},
	});
	if (!c) notFound();

	const size = pageSizeFrom(sizeParam);
	const where = {
		caseId: c.id,
		...(q ? { value: { contains: q.toLowerCase() } } : {}),
	};

	const isEditable =
		access.group === "initiator" &&
		(c.stage === "draft" || c.stage === "initiator");
	const isAdmin = user.role === "admin";
	const showTasks =
		isAdmin || access.group === "asp" || access.group === "anr";
	const caseTasks = showTasks ? await listCaseTasks(c.processInstanceId) : [];

	const notes =
		tab === "comentarii"
			? await prisma.caseNote.findMany({
					where: { caseId: c.id },
					orderBy: { createdAt: "asc" },
				})
			: [];
	const files =
		tab === "fisiere"
			? await prisma.caseFile.findMany({
					where: { caseId: c.id },
					orderBy: { createdAt: "asc" },
				})
			: [];

	const ids = [
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

	const [users, total, openTask] = await Promise.all([
		prisma.user.findMany({ where: { id: { in: ids } } }),
		prisma.caseDomain.count({ where }),
		findOpenTask(user, c.processInstanceId),
	]);
	const pages = Math.max(1, Math.ceil(total / size));
	const current = Math.min(Math.max(1, Number(page) || 1), pages);

	const domains = isEditable
		? []
		: await prisma.caseDomain.findMany({
				where,
				orderBy: { position: "asc" },
				skip: (current - 1) * size,
				take: size,
			});
	const allTotal = q
		? await prisma.caseDomain.count({ where: { caseId: c.id } })
		: total;

	const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;

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

	const resubmitted = c.comments.some((x) => x.decision === "retrimis");
	const hasSent = c.comments.some((x) => x.decision === "trimis");
	const isDraft = access.group === "initiator" && c.stage === "draft";
	const awaitingFix = access.group === "initiator" && c.stage === "initiator";
	const rejection = awaitingFix
		? [...c.comments]
				.filter((x) => x.decision === "nu")
				.sort(
					(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
				)[0]
		: null;

	const allRows = isEditable
		? await prisma.caseDomain.findMany({
				where: { caseId: c.id },
				orderBy: { position: "asc" },
				select: { id: true, position: true, value: true },
			})
		: [];
	const dupMap = isEditable
		? groupDuplicates(await findDuplicates(c.id))
		: new Map();
	const duplicates = Object.fromEntries(
		[...dupMap].map(([value, list]) => [
			value,
			list.map((d) => ({
				number: d.number,
				stage: d.stage,
				own: d.createdById === user.id,
			})),
		]),
	);
	const invalidCount = allRows.filter(
		(r) => domainProblem(r.value) || dupMap.has(r.value),
	).length;

	const flashDetail =
		[
			col && /^[A-Z]{1,3}$/.test(col)
				? `Domeniile au fost citite din coloana ${col}.`
				: null,
			Number(dup) > 0 ? `${dup} duplicate au fost eliminate.` : null,
		]
			.filter(Boolean)
			.join(" ") || undefined;

	const events: TimelineEvent[] = [
		...(hasSent
			? []
			: [
					{
						id: `upload-${c.id}`,
						at: c.createdAt,
						title: "Inițiatorul a încărcat lista",
						who: nameOf(c.createdById),
						role: "Inițiator",
						note: resubmitted
							? null
							: `${c.fileName} · ${c._count.domains} domenii`,
						tone: "primary",
					} satisfies TimelineEvent,
				]),
		...c.comments
			.filter((x) => x.stage !== "isp")
			.map((x): TimelineEvent => {
				const role =
					x.stage === "initiator"
						? "Inițiator"
						: x.stage === "asp"
							? "ASP"
							: x.stage === "anr"
								? "ANRCETI"
								: "ISP";

				if (x.decision === "trimis")
					return {
						id: x.id,
						at: x.createdAt,
						title: "Inițiatorul a trimis lista",
						who: nameOf(x.userId),
						role,
						note: x.text,
						tone: "primary",
					};
				if (x.decision === "anulat")
					return {
						id: x.id,
						at: x.createdAt,
						title: "Inițiatorul a anulat cazul",
						who: nameOf(x.userId),
						role,
						note: x.text,
						tone: "slate",
					};
				if (x.decision === "retrimis")
					return {
						id: x.id,
						at: x.createdAt,
						title: "Inițiatorul a retrimis lista",
						who: nameOf(x.userId),
						role,
						note: x.text,
						tone: "amber",
					};
				if (x.decision === "preluat")
					return {
						id: x.id,
						at: x.createdAt,
						title: `${role} a preluat cazul`,
						who: nameOf(x.userId),
						role,
						note: x.text,
						tone: "slate",
					};
				if (x.decision === "eliberat")
					return {
						id: x.id,
						at: x.createdAt,
						title: `${role} a eliberat cazul`,
						who: nameOf(x.userId),
						role,
						note: x.text,
						tone: "slate",
					};

				const approved = x.decision === "da";
				return {
					id: x.id,
					at: x.createdAt,
					title: `${role} a ${approved ? "aprobat" : "respins"} lista`,
					who: nameOf(x.userId),
					role,
					note: x.text,
					tone: approved ? "green" : "red",
				};
			}),
	].sort((a, b) => a.at.getTime() - b.at.getTime());

	const latestByIsp = new Map<string, (typeof c.ispResponses)[number]>();
	for (const r of [...c.ispResponses].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
	))
		latestByIsp.set(r.userId, r);

	const ispIds = [
		...new Set([
			...c.comments.filter((x) => x.stage === "isp").map((x) => x.userId),
			...c.ispResponses.map((x) => x.userId),
			...caseTasks
				.filter((t) => t.taskDefinitionKey === "ispTask")
				.flatMap((t) => [t.assignee, t.candidateUser])
				.filter((v): v is string => Boolean(v)),
		]),
	].sort((a, b) => nameOf(a).localeCompare(nameOf(b), "ro"));

	const ispItems: IspItem[] = ispIds.map((uid) => {
		const last = latestByIsp.get(uid);
		const claim = c.comments
			.filter(
				(x) =>
					x.stage === "isp" &&
					x.userId === uid &&
					(x.decision === "preluat" || x.decision === "eliberat"),
			)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

		if (last)
			return {
				id: uid,
				name: nameOf(uid),
				label: ispStatusLabels[last.status] ?? last.status,
				tone: ispTones[last.status] ?? "slate",
				done: finalIspStatuses.includes(last.status),
			};
		if (claim?.decision === "preluat")
			return {
				id: uid,
				name: nameOf(uid),
				label: "Preluat",
				tone: "blue",
				done: false,
			};
		return {
			id: uid,
			name: nameOf(uid),
			label: "În așteptare",
			tone: "amber",
			done: false,
		};
	});

	const report =
		c.stage === "closed" && ispItems.length > 0
			? await (async () => {
					const failed = await prisma.ispDomainResult.findMany({
						where: { caseId: c.id, blocked: false },
						orderBy: { domain: { position: "asc" } },
						select: {
							id: true,
							userId: true,
							reason: true,
							domain: { select: { value: true } },
						},
					});
					const reporting = await prisma.ispDomainResult.groupBy({
						by: ["userId"],
						where: { caseId: c.id },
					});
					// Cazurile închise înainte de bifarea pe domenii nu au date.
					if (reporting.length < ispItems.length) return null;

					const failedIds = new Set(
						failed.map((f) => f.domain.value),
					);
					const failures: IspFailures[] = ispItems.map((i) => ({
						id: i.id,
						name: i.name,
						rows: failed
							.filter((f) => f.userId === i.id)
							.map((f) => ({
								id: f.id,
								value: f.domain.value,
								reason: f.reason,
							})),
					}));
					return {
						blockedByAll: c._count.domains - failedIds.size,
						failures,
					};
				})()
			: null;

	const activeTab: CaseTab =
		tab === "raport" && !report
			? "descriere"
			: !tabParam && report
				? "raport"
				: tab;

	const ispEventTitles: Record<string, string> = {
		notificat: "Sarcină creată, ISP notificat",
		preluat: "A preluat sarcina",
		eliberat: "A eliberat sarcina",
	};

	const branches: TimelineBranch[] = ispItems.map((item) => {
		const events: TimelineEvent[] = [
			...c.comments
				.filter((x) => x.stage === "isp" && x.userId === item.id)
				.map(
					(x): TimelineEvent => ({
						id: x.id,
						at: x.createdAt,
						title: ispEventTitles[x.decision] ?? x.decision,
						who: item.name,
						role: "ISP",
						note: x.text,
						tone: x.decision === "notificat" ? "blue" : "slate",
					}),
				),
			...c.ispResponses
				.filter((x) => x.userId === item.id)
				.map(
					(x): TimelineEvent => ({
						id: x.id,
						at: x.createdAt,
						title: `Stare: ${ispStatusLabels[x.status] ?? x.status}`,
						who: item.name,
						role: "ISP",
						note: x.reason,
						tone: ispTones[x.status] ?? "slate",
					}),
				),
		].sort((a, b) => a.at.getTime() - b.at.getTime());

		return {
			id: item.id,
			name: item.name,
			badge: <Pill tone={item.tone}>{item.label}</Pill>,
			events,
		};
	});

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

			{openTask && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
					<div>
						<p className="font-medium">
							{openTask.mine
								? "Ai o sarcină deschisă pe acest caz"
								: "O sarcină liberă așteaptă pe acest caz"}
						</p>
						<p className="text-sm text-muted-foreground">
							{openTask.name}
						</p>
					</div>
					<Button asChild>
						<Link href={`/tasks/${openTask.id}`}>
							{openTask.mine
								? "Deschide sarcina"
								: "Vezi și preia"}
							<ArrowRight />
						</Link>
					</Button>
				</div>
			)}

			<CaseTabs
				basePath={`/cases/${c.number}`}
				active={activeTab}
				hasReport={Boolean(report)}
				counts={{
					comentarii: c._count.notes,
					fisiere: c._count.files,
				}}
			/>

			{activeTab === "raport" && report && (
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

			{activeTab === "descriere" && (
				<>
					{awaitingFix && (
						<Card className="border-amber-300 bg-amber-50/50">
							<CardHeader>
								<CardTitle>Lista trebuie corectată</CardTitle>
								<CardDescription>
									Corectează domeniile direct în tabel, apoi
									retrimite lista. Poți și să o înlocuiești cu
									un fișier nou sau să anulezi cazul.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								{rejection && (
									<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
										<p className="font-medium text-destructive">
											Respins de{" "}
											{rejection.stage === "asp"
												? "ASP"
												: "ANRCETI"}
										</p>
										{rejection.text && (
											<p className="mt-1">
												{rejection.text}
											</p>
										)}
										<p className="mt-1 text-xs text-muted-foreground">
											{formatDateTime(
												rejection.createdAt,
											)}
										</p>
									</div>
								)}
								<RejectedActions
									number={c.number}
									domainCount={c._count.domains}
									invalidCount={invalidCount}
								/>
							</CardContent>
						</Card>
					)}

					{isDraft && (
						<Card className="border-primary/30 bg-primary/5">
							<CardHeader>
								<CardTitle>Ciornă, încă netrimisă</CardTitle>
								<CardDescription>
									Verifică lista, apoi trimite-o la validarea
									ASP. Ciorna o vezi doar tu și o poți șterge
									oricând până o trimiți.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DraftActions
									number={c.number}
									domainCount={c._count.domains}
									invalidCount={invalidCount}
								/>
							</CardContent>
						</Card>
					)}

					{!isDraft &&
						(c.stage === "cancelled" ? (
							<Card>
								<CardContent className="text-sm text-muted-foreground">
									Cazul a fost anulat de inițiator. Procesul
									s-a oprit, iar lista nu mai poate fi
									modificată.
								</CardContent>
							</Card>
						) : (
							<Card>
								<CardContent>
									<CaseStepper stage={c.stage} />
								</CardContent>
							</Card>
						))}

					<div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
						<div className="min-w-0">
							{isEditable ? (
								<EditableDomainsTable
									number={c.number}
									rows={allRows}
									duplicates={duplicates}
									q={q}
									page={Number(page) || 1}
									size={size}
									onlyInvalid={problems === "1"}
									basePath={`/cases/${c.number}`}
								/>
							) : (
								<DomainsTable
									domains={domains}
									total={total}
									allTotal={allTotal}
									page={current}
									size={size}
									q={q}
									basePath={`/cases/${c.number}`}
								/>
							)}
						</div>

						<div className="order-first flex flex-col gap-6 lg:order-last">
							<Card>
								<CardHeader>
									<CardTitle>Detalii</CardTitle>
								</CardHeader>
								<CardContent>
									<dl className="grid gap-3 text-sm">
										<div className="flex justify-between gap-4">
											<dt className="shrink-0 text-muted-foreground">
												Inițiator
											</dt>
											<dd className="min-w-0 text-right font-medium wrap-break-word">
												{nameOf(c.createdById)}
											</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="shrink-0 text-muted-foreground">
												Fișier
											</dt>
											<dd className="min-w-0 text-right font-medium break-all">
												{c.fileName}
											</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="shrink-0 text-muted-foreground">
												Domenii
											</dt>
											<dd className="font-medium tabular-nums">
												{c._count.domains}
											</dd>
										</div>
									</dl>
								</CardContent>
							</Card>

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
