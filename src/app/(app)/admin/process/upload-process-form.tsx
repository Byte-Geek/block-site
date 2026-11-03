"use client";

import { LoaderCircle } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import FileDropzone from "@/components/file-dropzone";
import { FormError } from "@/components/form-error";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { uploadProcess } from "./actions";

export default function UploadProcessForm() {
	const [state, action, pending] = useActionState(uploadProcess, {});
	const [file, setFile] = useState<File | null>(null);

	useEffect(() => {
		if (state.ok) {
			toast.success(state.ok);
			setFile(null);
		}
	}, [state]);

	function submit() {
		if (!file) return;
		const data = new FormData();
		data.set("file", file);
		startTransition(() => action(data));
	}

	return (
		<div className="flex flex-col gap-4">
			<FileDropzone
				id="process-file"
				file={file}
				onFile={setFile}
				accept=".xml,.bpmn"
				hint="Fișier .bpmn20.xml sau .bpmn"
			/>

			<FormError>{state.error}</FormError>

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button disabled={!file || pending}>
						{pending && <LoaderCircle className="animate-spin" />}
						{pending ? "Se încarcă..." : "Încarcă schema"}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Încarci o versiune nouă?</AlertDialogTitle>
						<AlertDialogDescription>
							Cazurile noi vor porni pe această versiune. Cazurile deja pornite
							rămân pe versiunea cu care au început.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Anulează</AlertDialogCancel>
						<AlertDialogAction onClick={submit}>Încarcă</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
