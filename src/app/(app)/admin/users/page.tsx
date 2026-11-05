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
import { isAdmin, processRoles, roleLabels } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { CreateUserDialog, EditUserDialog } from "./_components/user-dialogs";
import { deleteUser } from "./actions";

export default async function UsersPage() {
	await requirePermission("user", "list");
	const { users } = await auth.api.listUsers({
		query: { limit: 100 },
		headers: await headers(),
	});
	const roleOptions = processRoles.map((key) => ({
		key,
		name: roleLabels[key],
	}));

	return (
		<PageShell className="max-w-4xl">
			<PageHeader
				title="Utilizatori"
				description={users.length === 1 ? "Un cont" : `${users.length} conturi`}
				actions={<CreateUserDialog roles={roleOptions} />}
			/>

			<div className="overflow-hidden rounded-xl border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Utilizator</TableHead>
							<TableHead>Rol</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((u) => {
							const admin = isAdmin(u.role);

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
												{roleLabels[u.role as keyof typeof roleLabels] ??
													roleLabels.user}
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
													role={u.role ?? ""}
													roles={roleOptions}
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
