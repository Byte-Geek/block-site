"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmUpload, requestUpload } from "../_actions/tab-actions";

export default function FileUploadForm({ number }: { number: number }) {
	const ref = useRef<HTMLFormElement>(null);
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		const file = data.get("file");
		if (!(file instanceof File) || file.size === 0) {
			setError("Alege un fișier");
			return;
		}

		setError(undefined);
		setPending(true);
		try {
			const issued = await requestUpload(number, file.size);
			if (issued.error || !issued.url || !issued.key) {
				setError(issued.error ?? "Încărcarea nu a putut începe");
				return;
			}

			const put = await fetch(issued.url, {
				method: "PUT",
				body: file,
			}).catch(() => null);
			if (!put?.ok) {
				setError(
					"Încărcarea în S3 a eșuat. Verifică serverul de fișiere și setarea CORS.",
				);
				return;
			}

			const done = await confirmUpload({
				number,
				key: issued.key,
				name: file.name,
				contentType: file.type,
				note: String(data.get("note") ?? ""),
			});
			if (done.error) {
				setError(done.error);
				return;
			}
			toast.success(done.ok);
			ref.current?.reset();
		} finally {
			setPending(false);
		}
	}

	return (
		<form
			ref={ref}
			onSubmit={onSubmit}
			className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2"
		>
			<div className="grid gap-2">
				<Label htmlFor="case-file">Fișier (maximum 25 MB)</Label>
				<Input id="case-file" name="file" type="file" required />
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
						{pending ? (
							<LoaderCircle className="animate-spin" />
						) : (
							<Upload />
						)}
						Încarcă fișierul
					</Button>
				</div>
			</div>
		</form>
	);
}
