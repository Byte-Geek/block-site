"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFile } from "./tab-actions";

export default function FileUploadForm({ number }: { number: number }) {
	const [state, action, pending] = useActionState(uploadFile, {});
	const ref = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (state.ok) {
			toast.success(state.ok);
			ref.current?.reset();
		}
	}, [state]);

	return (
		<form
			ref={ref}
			action={action}
			className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2"
		>
			<input type="hidden" name="number" value={number} />
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
				<FormError>{state.error}</FormError>
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
