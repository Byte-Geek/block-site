"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote } from "./tab-actions";

export default function NoteForm({ number }: { number: number }) {
	const [state, action, pending] = useActionState(addNote, {});
	const ref = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (state.ok) {
			toast.success(state.ok);
			ref.current?.reset();
		}
	}, [state]);

	return (
		<form ref={ref} action={action} className="flex flex-col gap-3">
			<input type="hidden" name="number" value={number} />
			<Textarea
				name="text"
				rows={3}
				maxLength={2000}
				placeholder="Scrie un comentariu"
				className="field-sizing-fixed max-h-48 resize-none overflow-y-auto"
				required
			/>
			<FormError>{state.error}</FormError>
			<div>
				<Button type="submit" disabled={pending}>
					{pending && <LoaderCircle className="animate-spin" />}
					Adaugă comentariul
				</Button>
			</div>
		</form>
	);
}
