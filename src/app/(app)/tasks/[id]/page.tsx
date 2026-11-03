import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DomainsTable from "@/components/domains-table";
import { PageHeader, PageShell } from "@/components/page-shell";
import { IspStatusBadge, StageBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/current-user";
import { formatDateTime } from "@/lib/format";
import { pageSizeFrom } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getTaskForUser } from "@/lib/task-access";
import ClaimBar from "./claim-bar";
import DecisionForm from "./decision-form";
import IspForm from "./isp-form";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ page?: string; q?: string; size?: string }>;
};

export default async function TaskPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { page = "1", q = "", size: sizeParam } = await searchParams;

	const user = await requireUser();
	if (!user.group) redirect("/");

	const found = await getTaskForUser(id, user);
	if (!found) notFound();
	const { task, c, mine } = found;

	const size = pageSizeFrom(sizeParam);
	const where = {
		caseId: c.id,
		...(q ? { value: { contains: q.toLowerCase() } } : {}),
	};
	const total = await prisma.caseDomain.count({ where });
	const pages = Math.max(1, Math.ceil(total / size));
	const current = Math.min(Math.max(1, Number(page) || 1), pages);
	const domains = await prisma.caseDomain.findMany({
		where,
		orderBy: { position: "asc" },
		skip: (current - 1) * size,
		take: size,
	});
	const allTotal = q
		? await prisma.caseDomain.count({ where: { caseId: c.id } })
		: total;

	const last =
		user.group === "isp"
			? await prisma.ispResponse.findFirst({
					where: { caseId: c.id, userId: user.id },
					orderBy: { createdAt: "desc" },
				})
			: null;

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
						domains={domains}
						total={total}
						allTotal={allTotal}
						page={current}
						size={size}
						q={q}
						basePath={`/tasks/${id}`}
					/>
				</div>

				<div className="order-first flex flex-col gap-4 lg:sticky lg:top-6 lg:order-last">
					{["asp", "anr", "isp"].includes(user.group) && (
						<ClaimBar taskId={task.id} mine={mine} />
					)}

					{mine && ["asp", "anr"].includes(user.group) && (
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
									stage={user.group as "asp" | "anr"}
								/>
							</CardContent>
						</Card>
					)}

					{mine && user.group === "isp" && (
						<Card>
							<CardHeader>
								<CardTitle>Starea blocării</CardTitle>
								<CardDescription>
									Actualizează starea pe măsură ce avansezi. Stările finale
									închid sarcina.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Starea curentă</span>
									<IspStatusBadge status={last?.status ?? null} />
								</div>
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
