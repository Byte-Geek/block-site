"use client";

import { LoaderCircle } from "lucide-react";
import {
	type ReactNode,
	startTransition,
	useActionState,
	useState,
} from "react";
import { toast } from "sonner";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

type State = { error?: string; ok?: string; details?: string[] };

type Props = {
	trigger: ReactNode;
	title: string;
	description?: string;
	submitLabel: string;
	action: (prev: State, formData: FormData) => Promise<State>;
	children: ReactNode;
};

function DialogForm({
	title,
	description,
	submitLabel,
	action,
	children,
	onDone,
}: Omit<Props, "trigger"> & { onDone: () => void }) {
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
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const data = new FormData(e.currentTarget);
				startTransition(() => formAction(data));
			}}
			className="flex flex-col gap-4"
		>
			<DialogHeader>
				<DialogTitle>{title}</DialogTitle>
				{description && <DialogDescription>{description}</DialogDescription>}
			</DialogHeader>
			<div className="flex flex-col gap-4">{children}</div>
			<FormError details={state.details}>{state.error}</FormError>
			<DialogFooter>
				<DialogClose asChild>
					<Button type="button" variant="outline" disabled={pending}>
						Anulează
					</Button>
				</DialogClose>
				<Button type="submit" disabled={pending}>
					{pending && <LoaderCircle className="animate-spin" />}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	);
}

export default function FormDialog({ trigger, ...rest }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogForm {...rest} onDone={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
