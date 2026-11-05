"use client";

import { Plus } from "lucide-react";
import { startTransition, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { useActionWithToast } from "@/hooks/use-action-with-toast";
import { addDomain } from "../_actions/domain-actions";

export default function AddDomainRow({ number }: { number: number }) {
	const [value, setValue] = useState("");
	const [submitted, setSubmitted] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [state, action, pending] = useActionWithToast(addDomain, () => {
		setValue("");
		inputRef.current?.focus();
	});

	const showError = Boolean(state.error) && submitted === value;

	function submit() {
		if (!value.trim()) return;
		const data = new FormData();
		data.set("number", String(number));
		data.set("value", value);
		setSubmitted(value);
		startTransition(() => action(data));
	}

	return (
		<TableRow className="bg-muted/30 hover:bg-muted/30">
			<TableCell className="text-muted-foreground">
				<Plus className="size-4" />
			</TableCell>
			<TableCell colSpan={2}>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						submit();
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
