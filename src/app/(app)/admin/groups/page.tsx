import DeleteDialog from "@/components/delete-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { deleteGroup } from "./actions";
import { CreateGroupDialog, RenameGroupDialog } from "./group-dialogs";

const systemGroups = ["initiator", "asp", "anr", "isp"];

export default async function GroupsPage() {
	await requireAdmin();
	const groups = await prisma.group.findMany({
		orderBy: { createdAt: "asc" },
		include: { _count: { select: { members: true } } },
	});

	return (
		<PageShell className="max-w-4xl">
			<PageHeader
				title="Grupuri"
				description="Grupurile de sistem sunt folosite de proces și nu pot fi șterse."
				actions={<CreateGroupDialog />}
			/>

			<div className="overflow-hidden rounded-xl border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Cheie</TableHead>
							<TableHead>Denumire</TableHead>
							<TableHead>Membri</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{groups.map((g) => {
							const system = systemGroups.includes(g.key);
							return (
								<TableRow key={g.id}>
									<TableCell className="font-mono text-sm">
										<span className="flex items-center gap-2">
											{g.key}
											{system && <Badge variant="secondary">Sistem</Badge>}
										</span>
									</TableCell>
									<TableCell className="font-medium">{g.name}</TableCell>
									<TableCell className="tabular-nums">
										{g._count.members}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<RenameGroupDialog
												group={{
													key: g.key,
													name: g.name,
												}}
											/>
											{!system && (
												<DeleteDialog
													action={deleteGroup}
													fields={{ key: g.key }}
													title="Ștergi grupul?"
													description={`Grupul „${g.name}” se șterge din platformă și din Flowable. Nu se poate șterge dacă are membri.`}
												/>
											)}
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</PageShell>
	);
}
