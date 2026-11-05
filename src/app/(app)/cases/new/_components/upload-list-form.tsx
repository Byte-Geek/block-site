"use client";

import { LoaderCircle } from "lucide-react";
import FileDropzone from "@/components/common/file-dropzone";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { useFileForm } from "@/hooks/use-file-form";
import { SPREADSHEET_EXTENSIONS } from "@/lib/storage/file-rules";
import { createDraft } from "../_actions/draft-actions";

export default function UploadListForm() {
	const { file, setFile, state, pending, submit } = useFileForm(createDraft);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
			className="flex flex-col gap-4"
		>
			<FileDropzone
				id="list-file"
				file={file}
				onFile={setFile}
				extensions={SPREADSHEET_EXTENSIONS}
			/>

			<FormError details={state.details}>{state.error}</FormError>

			<Button type="submit" disabled={!file || pending}>
				{pending && <LoaderCircle className="animate-spin" />}
				{pending ? "Se încarcă..." : "Încarcă fișierul"}
			</Button>
		</form>
	);
}
