"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DOCUMENT_EXTENSIONS, fileProblem } from "@/lib/storage/file-rules";
import {
	confirmAttachmentUpload,
	requestAttachmentUpload,
} from "../_actions/attachment-actions";

export function useAttachmentUpload(number: number) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	async function upload(file: File, note: string) {
		const problem = fileProblem(file, DOCUMENT_EXTENSIONS);
		if (problem) {
			setError(problem);
			return false;
		}

		setError(undefined);
		setPending(true);
		try {
			const issued = await requestAttachmentUpload(number, {
				name: file.name,
				size: file.size,
			});
			if (issued.error || !issued.url || !issued.key) {
				setError(issued.error ?? "Încărcarea nu a putut începe");
				return false;
			}

			const put = await fetch(issued.url, { method: "PUT", body: file }).catch(
				() => null,
			);
			if (!put?.ok) {
				setError(
					"Încărcarea în S3 a eșuat. Verifică serverul de fișiere și setarea CORS.",
				);
				return false;
			}

			const done = await confirmAttachmentUpload({
				number,
				key: issued.key,
				name: file.name,
				note,
			});
			if (done.error) {
				setError(done.error);
				return false;
			}
			toast.success(done.ok);
			return true;
		} finally {
			setPending(false);
		}
	}

	return { upload, error, pending };
}
