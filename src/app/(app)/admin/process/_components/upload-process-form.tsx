"use client";

import { LoaderCircle } from "lucide-react";
import FileDropzone from "@/components/common/file-dropzone";
import { FormError } from "@/components/common/form-error";
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
import { useFileForm } from "@/hooks/use-file-form";
import { uploadProcess } from "../_actions/process-actions";

export default function UploadProcessForm() {
	const { file, setFile, state, pending, submit } = useFileForm(uploadProcess);

	return (
		<div className="flex flex-col gap-4">
			<FileDropzone
				id="process-file"
				file={file}
				onFile={setFile}
				extensions={[".xml", ".bpmn"]}
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
