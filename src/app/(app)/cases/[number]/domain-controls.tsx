"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Check, ListPlus, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import DeleteDialog from "@/components/delete-dialog";
import FormDialog from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	addDomain,
	addDomains,
	deleteDomain,
	updateDomain,
} from "./domain-actions";

type State = { error?: string; ok?: string; details?: string[] };

export function AddDomainRow({ number }: { number: number }) {
	const [value, setValue] = useState("");
	const [submitted, setSubmitted] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [state, action, pending] = useActionState(
		async (prev: State, data: FormData) => {
			const result = await addDomain(prev, data);
			if (result.ok) {
				toast.success(result.ok);
				setValue("");
				inputRef.current?.focus();
			}
			return result;
		},
		{} as State,
	);

	const showError = Boolean(state.error) && submitted === value;

	return (
		<TableRow className="bg-muted/30 hover:bg-muted/30">
			<TableCell className="text-muted-foreground">
				<Plus className="size-4" />
			</TableCell>
			<TableCell colSpan={2}>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (!value.trim()) return;
						const data = new FormData();
						data.set("number", String(number));
						data.set("value", value);
						setSubmitted(value);
						startTransition(() => action(data));
					}}
					className="flex flex-col gap-1"
				>
					<div className="flex gap-2">
						<Input
							ref={inputRef}
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder="Adaugă un domeniu și apasă Enter"
							className="font-mono text-sm"
							aria-invalid={showError}
						/>
						<Button type="submit" size="sm" disabled={pending || !value.trim()}>
							Adaugă
						</Button>
					</div>
					{showError && (
						<p className="text-xs text-destructive">{state.error}</p>
					)}
				</form>
			</TableCell>
		</TableRow>
	);
}

type Row = {
	id: string;
	position: number;
	value: string;
	problem: string | null;
};

export function DomainRow({ number, row }: { number: number; row: Row }) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(row.value);
	const [submitted, setSubmitted] = useState("");
	const [state, action, pending] = useActionState(
		async (prev: State, data: FormData) => {
			const result = await updateDomain(prev, data);
			if (result.ok) setEditing(false);
			return result;
		},
		{} as State,
	);

	function save() {
		const data = new FormData();
		data.set("number", String(number));
		data.set("id", row.id);
		data.set("value", value);
		setSubmitted(value);
		startTransition(() => action(data));
	}

	function startEdit() {
		setValue(row.value);
		setSubmitted("");
		setEditing(true);
	}

	const showError = Boolean(state.error) && submitted === value;

	return (
		<TableRow className={cn(row.problem && "bg-destructive/5")}>
			<TableCell className="text-muted-foreground tabular-nums">
				{row.position}
			</TableCell>
			<TableCell>
				{editing ? (
					<div className="flex flex-col gap-1">
						<Input
							autoFocus
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									save();
								}
								if (e.key === "Escape") setEditing(false);
							}}
							className="font-mono text-sm"
							aria-invalid={showError}
						/>
						{showError && (
							<p className="text-xs text-destructive">{state.error}</p>
						)}
					</div>
				) : (
					<div className="flex flex-col">
						<span
							className={cn(
								"font-mono text-sm",
								row.problem && "text-destructive",
							)}
						>
							{row.value}
						</span>
						{row.problem && (
							<span className="text-xs text-destructive">{row.problem}</span>
						)}
					</div>
				)}
			</TableCell>
			<TableCell className="w-28 text-right">
				<div className="flex justify-end gap-1">
					{editing ? (
						<>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Salvează"
								onClick={save}
								disabled={pending}
							>
								<Check />
							</Button>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Renunță"
								onClick={() => setEditing(false)}
							>
								<X />
							</Button>
						</>
					) : (
						<>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								aria-label="Editează"
								onClick={startEdit}
							>
								<Pencil />
							</Button>
							<DeleteDialog
								action={deleteDomain}
								fields={{ number: String(number), id: row.id }}
								title="Ștergi domeniul?"
								description={`Domeniul „${row.value}” se scoate din listă, iar numerotarea se reface.`}
							/>
						</>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}

export function BulkAddDialog({ number }: { number: number }) {
	return (
		<FormDialog
			trigger={
				<Button type="button" variant="outline">
					<ListPlus />
					Adaugă mai multe
				</Button>
			}
			title="Adaugă mai multe domenii"
			description="Lipește domeniile, câte unul pe rând sau separate prin virgulă. Cele care există deja se omit."
			submitLabel="Adaugă"
			action={addDomains}
		>
			<input type="hidden" name="number" value={number} />
			<Textarea
				name="text"
				rows={10}
				placeholder={"exemplu.md\nalt-exemplu.com"}
				className="font-mono text-sm"
				required
			/>
		</FormDialog>
	);
}
