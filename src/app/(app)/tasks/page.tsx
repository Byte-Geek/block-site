import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import EmptyState from "@/components/common/empty-state";
import FilterPills from "@/components/common/filter-pills";
import FlashToast from "@/components/common/flash-toast";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { type FlowTask, listTasksForUser } from "@/lib/workflow/tasks";

type Props = { searchParams: Promise<{ ok?: string; tab?: string }> };

export default async function TasksPage({ searchParams }: Props) {
	const { ok, tab } = await searchParams;
	const user = await requireUser();
	if (!user.group) redirect("/");
	if (user.group === "initiator") redirect("/cases");

	const { mine, available } = await listTasksForUser(user);

	const cases = await prisma.case.findMany({
		where: {
			processInstanceId: {
				in: [...mine, ...available].map((t) => t.processInstanceId),
			},
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

	const active =
		tab === "mine" || tab === "available"
			? tab
			: mineRows.length > 0
				? "mine"
				: "available";
	const tasks = active === "mine" ? mineRows : availableRows;

	const pills = [
		{ key: "mine", label: "Ale mele", count: mineRows.length },
		{ key: "available", label: "Disponibile", count: availableRows.length },
	].map((p) => ({
		...p,
		href: `/tasks?tab=${p.key}`,
		active: p.key === active,
	}));

	const emptyText =
		active === "mine"
			? "Nu ai nicio sarcină preluată. Alege una din fila „Disponibile”."
			: user.group === "isp"
				? "Sarcinile noi apar aici când un caz aprobat ajunge la ISP-uri."
				: "Nu sunt sarcini libere. Cazurile noi apar aici când ajung la grupul tău.";

	return (
		<PageShell>
			<FlashToast ok={ok} />
			<PageHeader
				title="Sarcini"
				description={`${mineRows.length} preluate · ${availableRows.length} libere`}
			/>

			<FilterPills items={pills} />

			{tasks.length === 0 ? (
				<EmptyState icon={Inbox} title="Nicio sarcină aici">
					{emptyText}
				</EmptyState>
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
