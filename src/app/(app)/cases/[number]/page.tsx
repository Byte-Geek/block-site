import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { caseAccess } from "@/lib/case-access";
import { requireUser } from "@/lib/current-user";
import { formatDateTime } from "@/lib/format";
import { domainProblem } from "@/lib/domains";
import { ispStatusLabels } from "@/lib/constants";
import { pageSizeFrom } from "@/lib/pagination";
import { findOpenTask, listCaseTasks } from "@/lib/task-access";
import CaseStepper from "@/components/case-stepper";
import DomainsTable from "@/components/domains-table";
import FlashToast from "@/components/flash-toast";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
	IspStatusBadge,
	StageBadge,
	ispTones,
} from "@/components/status-badge";
import Timeline, { type TimelineEvent } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import CaseTasksCard from "./case-tasks-card";
import DraftActions from "./draft-actions";
import EditableDomainsTable from "./editable-domains-table";
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
	} = await searchParams;

	const user = await requireUser();
	const access = caseAccess(user);
	if (!access) redirect("/");

	const c = await prisma.case.findFirst({
		where: { AND: [access.where, { number: n }] },
		include: {
			comments:
				access.group === "isp"
					? {
							where: {
								OR: [
									{ stage: { not: "isp" } },
									{ userId: user.id },
								],
							},
						}
					: true,
			ispResponses: {
				where: access.group === "isp" ? { userId: user.id } : {},
			},
			_count: { select: { domains: true } },
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

	const ids = [
		c.createdById,
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
	const invalidCount = allRows.filter((r) => domainProblem(r.value)).length;

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
		...c.comments.map((x): TimelineEvent => {
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
		...c.ispResponses.map(
			(x): TimelineEvent => ({
				id: x.id,
				at: x.createdAt,
				title: `ISP: ${ispStatusLabels[x.status] ?? x.status}`,
				who: nameOf(x.userId),
				role: "ISP",
				note: x.reason,
				tone: ispTones[x.status] ?? "slate",
			}),
		),
	].sort((a, b) => a.at.getTime() - b.at.getTime());

	const latestByIsp = new Map<string, (typeof c.ispResponses)[number]>();
	for (const r of [...c.ispResponses].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
	))
		latestByIsp.set(r.userId, r);
	const ispLatest = [...latestByIsp.values()];

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

			{awaitingFix && (
				<Card className="border-amber-300 bg-amber-50/50">
					<CardHeader>
						<CardTitle>Lista trebuie corectată</CardTitle>
						<CardDescription>
							Corectează domeniile direct în tabel, apoi retrimite
							lista. Poți și să o înlocuiești cu un fișier nou sau
							să anulezi cazul.
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
									<p className="mt-1">{rejection.text}</p>
								)}
								<p className="mt-1 text-xs text-muted-foreground">
									{formatDateTime(rejection.createdAt)}
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
							Verifică lista, apoi trimite-o la validarea ASP.
							Ciorna o vezi doar tu și o poți șterge oricând până
							o trimiți.
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
							Cazul a fost anulat de inițiator. Procesul s-a
							oprit, iar lista nu mai poate fi modificată.
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
									<dt className="text-muted-foreground">
										Inițiator
									</dt>
									<dd className="font-medium">
										{nameOf(c.createdById)}
									</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">
										Fișier
									</dt>
									<dd className="truncate font-medium">
										{c.fileName}
									</dd>
								</div>
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">
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
						<CaseTasksCard rows={taskRows} canRelease={isAdmin} />
					)}

					{ispLatest.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Starea ISP-urilor</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="flex flex-col gap-3">
									{ispLatest.map((r) => (
										<li
											key={r.userId}
											className="flex items-center justify-between gap-3 text-sm"
										>
											<span className="truncate">
												{nameOf(r.userId)}
											</span>
											<IspStatusBadge status={r.status} />
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					)}

					{!isDraft && (
						<Card>
							<CardHeader>
								<CardTitle>Istoric</CardTitle>
							</CardHeader>
							<CardContent>
								<Timeline events={events} />
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</PageShell>
	);
}
