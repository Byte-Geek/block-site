"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { type FormEvent, useRef } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	DOCUMENT_EXTENSIONS,
	MAX_FILE_SIZE_LABEL,
} from "@/lib/storage/file-rules";
import { useAttachmentUpload } from "../_hooks/use-attachment-upload";

export default function AttachmentUploadForm({ number }: { number: number }) {
	const ref = useRef<HTMLFormElement>(null);
	const { upload, error, pending } = useAttachmentUpload(number);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		const file = data.get("file");
		if (!(file instanceof File)) return;

		if (await upload(file, String(data.get("note") ?? "")))
			ref.current?.reset();
	}

	return (
		<form
			ref={ref}
			onSubmit={onSubmit}
			className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2"
		>
			<div className="grid gap-2">
				<Label htmlFor="case-file">
					Fișier Excel, PDF sau Word (maximum {MAX_FILE_SIZE_LABEL})
				</Label>
				<Input
					id="case-file"
					name="file"
					type="file"
					accept={DOCUMENT_EXTENSIONS.join(",")}
					required
				/>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="case-file-note">Descriere (opțional)</Label>
				<Input
					id="case-file-note"
					name="note"
					maxLength={500}
					placeholder="Ce conține fișierul"
				/>
			</div>
			<div className="flex flex-col gap-3 sm:col-span-2">
				<FormError>{error}</FormError>
				<div>
					<Button type="submit" disabled={pending}>
						{pending ? <LoaderCircle className="animate-spin" /> : <Upload />}
						Încarcă fișierul
					</Button>
				</div>
			</div>
		</form>
	);
}
