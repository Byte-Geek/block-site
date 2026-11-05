"use client";

import { LoaderCircle, PencilLine } from "lucide-react";
import { useActionState } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { createEmptyDraft } from "../_actions/draft-actions";

export default function EmptyDraftButton() {
	const [state, action, pending] = useActionState(createEmptyDraft, {});

	return (
		<form action={action} className="flex flex-col gap-3">
			<FormError>{state.error}</FormError>
			<Button type="submit" variant="outline" disabled={pending}>
				{pending ? <LoaderCircle className="animate-spin" /> : <PencilLine />}
				Începe fără fișier
			</Button>
		</form>
	);
}
