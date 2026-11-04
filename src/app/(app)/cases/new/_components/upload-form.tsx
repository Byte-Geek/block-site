"use client";

import { FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { createDraft } from "@/app/(app)/cases/new/actions";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
	return bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadForm() {
	const [state, action, pending] = useActionState(createDraft, {});
	const [file, setFile] = useState<File | null>(null);
	const [dragging, setDragging] = useState(false);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (!file) return;
				const data = new FormData();
				data.set("file", file);
				startTransition(() => action(data));
			}}
			className="flex flex-col gap-4"
		>
			<label
				htmlFor="list-file"
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					setFile(e.dataTransfer.files[0] ?? null);
				}}
				className={cn(
					"flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:bg-muted/50",
					dragging && "border-primary bg-primary/5",
				)}
			>
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Upload className="size-5 text-muted-foreground" />
				</div>
				<p className="font-medium">Trage fișierul aici sau apasă ca să alegi</p>
				<p className="text-sm text-muted-foreground">Format .xlsx</p>
				<input
					id="list-file"
					type="file"
					accept=".xlsx"
					className="sr-only"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
			</label>

			{file && (
				<div className="flex items-center gap-3 rounded-lg border p-3">
					<FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{file.name}</p>
						<p className="text-xs text-muted-foreground">
							{formatSize(file.size)}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Scoate fișierul"
						onClick={() => setFile(null)}
					>
						<X />
					</Button>
				</div>
			)}

			<FormError details={state.details}>{state.error}</FormError>

			<Button type="submit" disabled={!file || pending}>
				{pending && <LoaderCircle className="animate-spin" />}
				{pending ? "Se încarcă..." : "Încarcă fișierul"}
			</Button>
		</form>
	);
}
