import { headers } from "next/headers";
import DeleteDialog from "@/components/common/delete-dialog";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import UserAvatar from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { CreateUserDialog, EditUserDialog } from "./_components/user-dialogs";
import { deleteUser } from "./actions";

export default async function UsersPage() {
	await requireAdmin();
	const { users } = await auth.api.listUsers({
		query: { limit: 100 },
		headers: await headers(),
	});
	const groups = await prisma.group.findMany({
		orderBy: { createdAt: "asc" },
	});
	const memberships = await prisma.membership.findMany();
	const groupOptions = groups.map((g) => ({ key: g.key, name: g.name }));

	return (
		<PageShell className="max-w-4xl">
			<PageHeader
				title="Utilizatori"
				description={users.length === 1 ? "Un cont" : `${users.length} conturi`}
				actions={<CreateUserDialog groups={groupOptions} />}
			/>

			<div className="overflow-hidden rounded-xl border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Utilizator</TableHead>
							<TableHead>Grup</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((u) => {
							const admin = u.role === "admin";
							const m = memberships.find((x) => x.userId === u.id);
							const group = groups.find((g) => g.key === m?.groupKey);

							return (
								<TableRow key={u.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<UserAvatar name={u.name} />
											<div className="min-w-0">
												<p className="truncate font-medium">{u.name}</p>
												<p className="truncate text-xs text-muted-foreground">
													{u.email}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										{admin ? (
											<Badge>Administrator</Badge>
										) : (
											<Badge variant="secondary">
												{group?.name ?? "Fără grup"}
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">
										{!admin && (
											<div className="flex justify-end gap-1">
												<EditUserDialog
													user={{
														id: u.id,
														name: u.name,
														email: u.email,
													}}
													groupKey={m?.groupKey ?? ""}
													groups={groupOptions}
												/>
												<DeleteDialog
													action={deleteUser}
													fields={{ userId: u.id }}
													title="Ștergi utilizatorul?"
													description={`Contul ${u.email} se șterge definitiv, din platformă și din Flowable. Nu se poate șterge dacă are istoric sau sarcini deschise.`}
												/>
											</div>
										)}
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
