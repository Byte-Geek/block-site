"use client";

import { LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionWithToast } from "@/hooks/use-action-with-toast";
import { addNote } from "../_actions/note-actions";

export default function NoteForm({ number }: { number: number }) {
	const ref = useRef<HTMLFormElement>(null);
	const [state, action, pending] = useActionWithToast(addNote, () =>
		ref.current?.reset(),
	);

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
