"use client";

import { Pencil, Plus } from "lucide-react";
import { Field } from "@/components/field";
import FormDialog from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { createGroup, updateGroup } from "./actions";

export function CreateGroupDialog() {
	return (
		<FormDialog
			trigger={
				<Button>
					<Plus />
					Grup nou
				</Button>
			}
			title="Grup nou"
			description="Grupul se creează și în Flowable."
			submitLabel="Creează"
			action={createGroup}
		>
			<Field
				label="Cheie"
				name="key"
				placeholder="ex. asp"
				required
				hint="Litere mici, cifre și cratimă. Nu se mai poate schimba după creare."
			/>
			<Field label="Denumire" name="name" placeholder="ex. ASP" required />
		</FormDialog>
	);
}

export function RenameGroupDialog({
	group,
}: {
	group: { key: string; name: string };
}) {
	return (
		<FormDialog
			trigger={
				<Button variant="ghost" size="icon" aria-label="Redenumește">
					<Pencil />
				</Button>
			}
			title="Redenumește grupul"
			description={`Cheia „${group.key}” rămâne neschimbată.`}
			submitLabel="Salvează"
			action={updateGroup}
		>
			<input type="hidden" name="key" value={group.key} />
			<Field label="Denumire" name="name" defaultValue={group.name} required />
		</FormDialog>
	);
}
