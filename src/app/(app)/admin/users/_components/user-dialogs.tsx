"use client";

import { Pencil, Plus } from "lucide-react";
import FormDialog from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "../_actions/user-actions";
import { Field } from "./field";

type RoleOption = { key: string; name: string };

function RoleSelect({
	roles,
	defaultValue,
}: {
	roles: RoleOption[];
	defaultValue?: string;
}) {
	return (
		<div className="grid gap-2">
			<Label htmlFor="role">Rol</Label>
			<Select name="role" defaultValue={defaultValue || undefined}>
				<SelectTrigger id="role" className="w-full">
					<SelectValue placeholder="Alege rolul" />
				</SelectTrigger>
				<SelectContent>
					{roles.map((g) => (
						<SelectItem key={g.key} value={g.key}>
							{g.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function CreateUserDialog({ roles }: { roles: RoleOption[] }) {
	return (
		<FormDialog
			trigger={
				<Button>
					<Plus />
					Utilizator nou
				</Button>
			}
			title="Utilizator nou"
			description="Contul se creează și în Flowable, în grupul rolului ales."
			submitLabel="Creează"
			action={createUser}
		>
			<Field label="Nume" name="name" placeholder="ex. Orange ISP" required />
			<Field label="Email" name="email" type="email" required />
			<Field
				label="Parolă"
				name="password"
				type="password"
				minLength={8}
				required
				hint="Minim 8 caractere"
			/>
			<RoleSelect roles={roles} />
		</FormDialog>
	);
}

type EditProps = {
	user: { id: string; name: string; email: string };
	role: string;
	roles: RoleOption[];
};

export function EditUserDialog({ user, role, roles }: EditProps) {
	return (
		<FormDialog
			trigger={
				<Button variant="ghost" size="icon" aria-label="Editează">
					<Pencil />
				</Button>
			}
			title="Editează utilizatorul"
			description={user.email}
			submitLabel="Salvează"
			action={updateUser}
		>
			<input type="hidden" name="userId" value={user.id} />
			<input type="hidden" name="email" value={user.email} />
			<Field label="Nume" name="name" defaultValue={user.name} required />
			<RoleSelect roles={roles} defaultValue={role} />
			<Field
				label="Parolă nouă"
				name="password"
				type="password"
				minLength={8}
				hint="Lasă gol ca să păstrezi parola actuală"
			/>
		</FormDialog>
	);
}
