import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DomainsTable from "@/components/cases/domains-table";
import NotesPreview from "@/components/cases/notes-preview";
import { IspStatusBadge, StageBadge } from "@/components/common/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getDomainsPage } from "@/lib/cases/domain-page";
import { formatDateTime } from "@/lib/format";
import { pageSizeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { stageByTaskKey } from "@/lib/workflow/stages";
import { getTaskForUser } from "@/lib/workflow/tasks";
import ClaimBar from "./_components/claim-bar";
import DecisionForm from "./_components/decision-form";
import {
	IspDomainControl,
	IspSelectAll,
} from "./_components/isp-domain-controls";
import IspFinish from "./_components/isp-finish";
import IspForm from "./_components/isp-form";
import { getIspProgress } from "./_components/isp-progress";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ page?: string; q?: string; size?: string }>;
};

export default async function TaskPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { page = "1", q = "", size: sizeParam } = await searchParams;

	const user = await requireUser();
	if (!can(user.role, "task", "claim")) redirect("/");

	const found = await getTaskForUser(id, user);
	if (!found) notFound();
	const { task, c, mine } = found;
	const canExecute = can(user.role, "task", "execute");

	const domainsPage = await getDomainsPage(c.id, {
		q,
		page,
		size: pageSizeFrom(sizeParam),
	});

	const last = canExecute
		? await prisma.ispResponse.findFirst({
				where: { caseId: c.id, userId: user.id },
				orderBy: { createdAt: "desc" },
			})
		: null;

	const progress =
		mine && canExecute
			? await getIspProgress(
					c.id,
					user.id,
					domainsPage.domains.map((d) => d.id),
				)
			: null;

	const notes = await prisma.caseNote.findMany({
		where: { caseId: c.id },
		orderBy: { createdAt: "desc" },
	});
	const authors = await prisma.user.findMany({
		where: { id: { in: [...new Set(notes.map((n) => n.userId))] } },
		select: { id: true, name: true },
	});
	const names = new Map<string, string>(authors.map((u) => [u.id, u.name]));

	return (
		<PageShell>
			<PageHeader
				back={
					<Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
						<Link href="/tasks">
							<ChevronLeft />
							Sarcini
						</Link>
					</Button>
				}
				title={
					<>
						{task.name}{" "}
						<span className="font-normal text-muted-foreground">
							· caz #{c.number}
						</span>
					</>
				}
				description={`${c.fileName} · încărcat ${formatDateTime(c.createdAt)}`}
				actions={<StageBadge stage={c.stage} />}
			/>

			<div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
				<div className="min-w-0">
					<DomainsTable
						{...domainsPage}
						q={q}
						basePath={`/tasks/${id}`}
						extra={
							progress
								? {
										head: (
											<IspSelectAll
												taskId={task.id}
												allBlocked={progress.blocked === progress.total}
											/>
										),
										cells: Object.fromEntries(
											domainsPage.domains.map((d) => [
												d.id,
												<IspDomainControl
													key={d.id}
													taskId={task.id}
													domainId={d.id}
													blocked={
														progress.byDomain.get(d.id)?.blocked ?? false
													}
													reason={progress.byDomain.get(d.id)?.reason ?? null}
												/>,
											]),
										),
									}
								: undefined
						}
					/>
				</div>

				<div className="order-first flex flex-col gap-4 lg:sticky lg:top-6 lg:order-last">
					<NotesPreview
						number={c.number}
						notes={notes}
						nameOf={(id) => names.get(id) ?? id}
					/>

					{can(user.role, "task", "claim") && (
						<ClaimBar taskId={task.id} mine={mine} />
					)}

					{mine && can(user.role, "task", "decide") && (
						<Card>
							<CardHeader>
								<CardTitle>Decizie</CardTitle>
								<CardDescription>
									Verifică lista și aprobă sau respinge. La respingere,
									comentariul este obligatoriu.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DecisionForm
									taskId={task.id}
									stage={
										stageByTaskKey[task.taskDefinitionKey] as "asp" | "anr"
									}
								/>
							</CardContent>
						</Card>
					)}

					{progress && (
						<Card>
							<CardHeader>
								<CardTitle>Starea blocării</CardTitle>
								<CardDescription>
									Marchează fiecare domeniu în tabel. Când toate au bifă sau
									cauză, finalizezi sarcina.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Starea curentă</span>
									<IspStatusBadge status={last?.status ?? null} />
								</div>
								<Separator />
								<IspFinish
									taskId={task.id}
									total={progress.total}
									blocked={progress.blocked}
									withReason={progress.withReason}
								/>
								<Separator />
								<IspForm
									taskId={task.id}
									initialStatus={last?.status ?? "queued"}
								/>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</PageShell>
	);
}
