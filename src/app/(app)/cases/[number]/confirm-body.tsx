"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { FormError } from "@/components/form-error";
import {
	AlertDialogCancel,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type State = { error?: string; details?: string[] };
type Action = (prev: State, formData: FormData) => Promise<State>;

type Props = {
	action: Action;
	number: number;
	title: string;
	description: string;
	submitLabel: string;
	destructive?: boolean;
};

export default function ConfirmBody({
	action,
	number,
	title,
	description,
	submitLabel,
	destructive,
}: Props) {
	const [state, formAction, pending] = useActionState(action, {} as State);

	return (
		<form action={formAction} className="flex flex-col gap-4">
			<input type="hidden" name="number" value={number} />
			<AlertDialogHeader>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{description}</AlertDialogDescription>
			</AlertDialogHeader>
			<FormError>{state.error}</FormError>
			<AlertDialogFooter>
				<AlertDialogCancel type="button" disabled={pending}>
					Înapoi
				</AlertDialogCancel>
				<Button
					type="submit"
					variant={destructive ? "destructive" : "default"}
					disabled={pending}
				>
					{pending && <LoaderCircle className="animate-spin" />}
					{submitLabel}
				</Button>
			</AlertDialogFooter>
		</form>
	);
}
