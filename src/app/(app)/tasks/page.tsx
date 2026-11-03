import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";
import { formatDateTime } from "@/lib/format";
import { listTasksForUser, type FlowTask } from "@/lib/task-access";
import FlashToast from "@/components/flash-toast";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type Props = { searchParams: Promise<{ ok?: string; tab?: string }> };

export default async function TasksPage({ searchParams }: Props) {
	const { ok, tab } = await searchParams;
	const user = await requireUser();
	if (!user.group) redirect("/");
	if (user.group === "initiator") redirect("/cases");

	const isInitiator = user.group === "initiator";
	const { mine, available } = await listTasksForUser(user);

	const cases = await prisma.case.findMany({
		where: {
			processInstanceId: {
				in: [...mine, ...available].map((t) => t.processInstanceId),
			},
			...(isInitiator ? { createdById: user.id } : {}),
		},
		include: { _count: { select: { domains: true } } },
	});

	const toRows = (list: FlowTask[]) =>
		list
			.flatMap((task) => {
				const c = cases.find(
					(x) => x.processInstanceId === task.processInstanceId,
				);
				return c ? [{ task, c }] : [];
			})
			.sort((a, b) => a.c.createdAt.getTime() - b.c.createdAt.getTime());

	const mineRows = toRows(mine);
	const availableRows = toRows(available);

	const active = isInitiator
		? "mine"
		: tab === "mine" || tab === "available"
			? tab
			: mineRows.length > 0
				? "mine"
				: "available";
	const tasks = active === "mine" ? mineRows : availableRows;

	const tabs = [
		{ key: "mine", label: "Ale mele", count: mineRows.length },
		{ key: "available", label: "Disponibile", count: availableRows.length },
	];

	const emptyText = isInitiator
		? "Cazurile respinse de ASP sau ANRCETI apar aici, ca să poți retrimite lista corectată."
		: active === "mine"
			? "Nu ai nicio sarcină preluată. Alege una din fila „Disponibile”."
			: user.group === "isp"
				? "Sarcinile noi apar aici când un caz aprobat ajunge la ISP-uri."
				: "Nu sunt sarcini libere. Cazurile noi apar aici când ajung la grupul tău.";

	return (
		<PageShell>
			<FlashToast ok={ok} />
			<PageHeader
				title="Sarcini"
				description={
					isInitiator
						? mineRows.length === 1
							? "O sarcină deschisă"
							: `${mineRows.length} sarcini deschise`
						: `${mineRows.length} preluate · ${availableRows.length} libere`
				}
			/>

			{!isInitiator && (
				<div className="flex flex-wrap gap-2">
					{tabs.map((t) => (
						<Button
							key={t.key}
							asChild
							size="sm"
							variant={active === t.key ? "default" : "outline"}
							className="rounded-full"
						>
							<Link href={`/tasks?tab=${t.key}`}>
								{t.label}
								<span
									className={
										active === t.key
											? "tabular-nums opacity-80"
											: "tabular-nums text-muted-foreground"
									}
								>
									{t.count}
								</span>
							</Link>
						</Button>
					))}
				</div>
			)}

			{tasks.length === 0 ? (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
					<div className="flex size-10 items-center justify-center rounded-full bg-muted">
						<Inbox className="size-5 text-muted-foreground" />
					</div>
					<p className="font-medium">Nicio sarcină aici</p>
					<p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Sarcină</TableHead>
								<TableHead>Caz</TableHead>
								<TableHead className="hidden md:table-cell">Fișier</TableHead>
								<TableHead>Domenii</TableHead>
								<TableHead className="hidden md:table-cell">Încărcat</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.map(({ task, c }) => (
								<TableRow key={task.id}>
									<TableCell className="font-medium">{task.name}</TableCell>
									<TableCell>#{c.number}</TableCell>
									<TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell">
										{c.fileName}
									</TableCell>
									<TableCell className="tabular-nums">
										{c._count.domains}
									</TableCell>
									<TableCell className="hidden text-muted-foreground md:table-cell">
										{formatDateTime(c.createdAt)}
									</TableCell>
									<TableCell className="text-right">
										<Button asChild size="sm" variant="outline">
											<Link href={`/tasks/${task.id}`}>
												{active === "available" ? "Vezi și preia" : "Deschide"}
												<ArrowRight />
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</PageShell>
	);
}
