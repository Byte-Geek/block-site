"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
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

type State = { error?: string; ok?: string };

type Props = {
	action: (prev: State, formData: FormData) => Promise<State>;
	fields: Record<string, string>;
	title: string;
	description: string;
};

function DeleteForm({
	action,
	fields,
	title,
	description,
	onDone,
}: Props & { onDone: () => void }) {
	const [state, formAction, pending] = useActionState(
		async (prev: State, data: FormData) => {
			const result = await action(prev, data);
			if (result.ok) {
				toast.success(result.ok);
				onDone();
			}
			return result;
		},
		{} as State,
	);

	return (
		<form action={formAction} className="flex flex-col gap-4">
			{Object.entries(fields).map(([name, value]) => (
				<input key={name} type="hidden" name={name} value={value} />
			))}
			<AlertDialogHeader>
				<AlertDialogTitle>{title}</AlertDialogTitle>
				<AlertDialogDescription>{description}</AlertDialogDescription>
			</AlertDialogHeader>
			<FormError>{state.error}</FormError>
			<AlertDialogFooter>
				<AlertDialogCancel type="button" disabled={pending}>
					Anulează
				</AlertDialogCancel>
				<Button type="submit" variant="destructive" disabled={pending}>
					{pending && <LoaderCircle className="animate-spin" />}
					Șterge
				</Button>
			</AlertDialogFooter>
		</form>
	);
}

export default function DeleteDialog(props: Props) {
	const [open, setOpen] = useState(false);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Șterge"
					className="text-destructive hover:text-destructive"
				>
					<Trash2 />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<DeleteForm {...props} onDone={() => setOpen(false)} />
			</AlertDialogContent>
		</AlertDialog>
	);
}
