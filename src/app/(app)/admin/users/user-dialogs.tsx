"use client";

import { Pencil, Plus } from "lucide-react";
import { Field } from "@/components/field";
import FormDialog from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "./actions";

type GroupOption = { key: string; name: string };

function GroupSelect({
	groups,
	defaultValue,
}: {
	groups: GroupOption[];
	defaultValue?: string;
}) {
	return (
		<div className="grid gap-2">
			<Label htmlFor="groupKey">Grup</Label>
			<Select name="groupKey" defaultValue={defaultValue || undefined}>
				<SelectTrigger id="groupKey" className="w-full">
					<SelectValue placeholder="Alege grupul" />
				</SelectTrigger>
				<SelectContent>
					{groups.map((g) => (
						<SelectItem key={g.key} value={g.key}>
							{g.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function CreateUserDialog({ groups }: { groups: GroupOption[] }) {
	return (
		<FormDialog
			trigger={
				<Button>
					<Plus />
					Utilizator nou
				</Button>
			}
			title="Utilizator nou"
			description="Contul se creează și în Flowable, în grupul ales."
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
			<GroupSelect groups={groups} />
		</FormDialog>
	);
}

type EditProps = {
	user: { id: string; name: string; email: string };
	groupKey: string;
	groups: GroupOption[];
};

export function EditUserDialog({ user, groupKey, groups }: EditProps) {
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
			<GroupSelect groups={groups} defaultValue={groupKey} />
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
