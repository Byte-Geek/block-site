"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactNode, useActionState } from "react";
import { FormError } from "@/components/common/form-error";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type State = { error?: string; details?: string[] };

type Props = {
	action: (prev: State, formData: FormData) => Promise<State>;
	number: number;
	trigger: ReactNode;
	title: string;
	description: string;
	submitLabel: string;
	destructive?: boolean;
};

function ConfirmForm({
	action,
	number,
	title,
	description,
	submitLabel,
	destructive,
}: Omit<Props, "trigger">) {
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

export default function ConfirmActionDialog({ trigger, ...rest }: Props) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
			<AlertDialogContent>
				<ConfirmForm {...rest} />
			</AlertDialogContent>
		</AlertDialog>
	);
}
