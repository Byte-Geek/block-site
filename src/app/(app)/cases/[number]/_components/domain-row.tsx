"use client";

import { Check, Pencil, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useState } from "react";
import DeleteDialog from "@/components/common/delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { useActionWithToast } from "@/hooks/use-action-with-toast";
import { stageLabels } from "@/lib/cases/constants";
import { cn } from "@/lib/utils";
import { deleteDomain, updateDomain } from "../_actions/domain-actions";

export type DomainRowData = {
	id: string;
	position: number;
	value: string;
	problem: string | null;
	dups: { number: number; stage: string; own: boolean }[];
};

export default function DomainRow({
	number,
	row,
}: {
	number: number;
	row: DomainRowData;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(row.value);
	const [submitted, setSubmitted] = useState("");
	const [state, action, pending] = useActionWithToast(updateDomain, () =>
		setEditing(false),
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
	const bad = Boolean(row.problem) || row.dups.length > 0;

	return (
		<TableRow className={cn(bad && "bg-destructive/5")}>
			<TableCell className="text-muted-foreground tabular-nums">
				{row.position}
			</TableCell>
			<TableCell className="whitespace-normal">
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
								"font-mono text-sm break-all",
								bad && "text-destructive",
							)}
						>
							{row.value}
						</span>
						{row.problem && (
							<span className="text-xs text-destructive">{row.problem}</span>
						)}
						{row.dups.map((d) => (
							<span key={d.number} className="text-xs text-destructive">
								Există deja în cazul{" "}
								{d.own ? (
									<Link
										href={`/cases/${d.number}`}
										className="font-medium underline"
									>
										#{d.number}
									</Link>
								) : (
									<span className="font-medium">#{d.number}</span>
								)}{" "}
								({stageLabels[d.stage] ?? d.stage})
							</span>
						))}
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
