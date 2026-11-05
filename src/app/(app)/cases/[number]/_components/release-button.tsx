"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { releaseTask } from "@/actions/task-assignment-actions";
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
import { useActionWithToast } from "@/hooks/use-action-with-toast";

type Props = { taskId: string; assigneeName: string };

function ReleaseForm({
	taskId,
	assigneeName,
	onDone,
}: Props & { onDone: () => void }) {
	const [state, action, pending] = useActionWithToast(releaseTask, onDone);

	return (
		<form action={action} className="flex flex-col gap-4">
			<input type="hidden" name="taskId" value={taskId} />
			<AlertDialogHeader>
				<AlertDialogTitle>Eliberezi sarcina?</AlertDialogTitle>
				<AlertDialogDescription>
					{assigneeName} nu va mai putea lucra pe ea, iar sarcina revine în grup
					ca să o poată prelua altcineva.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<FormError>{state.error}</FormError>
			<AlertDialogFooter>
				<AlertDialogCancel type="button" disabled={pending}>
					Anulează
				</AlertDialogCancel>
				<Button type="submit" disabled={pending}>
					{pending && <LoaderCircle className="animate-spin" />}
					Eliberează
				</Button>
			</AlertDialogFooter>
		</form>
	);
}

export default function ReleaseButton(props: Props) {
	const [open, setOpen] = useState(false);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm">
					Eliberează
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<ReleaseForm {...props} onDone={() => setOpen(false)} />
			</AlertDialogContent>
		</AlertDialog>
	);
}
