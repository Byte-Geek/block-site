"use client";

import { FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	id: string;
	file: File | null;
	onFile: (file: File | null) => void;
	accept: string;
	hint: string;
};

function formatSize(bytes: number) {
	return bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileDropzone({
	id,
	file,
	onFile,
	accept,
	hint,
}: Props) {
	const [dragging, setDragging] = useState(false);

	return (
		<div className="flex flex-col gap-3">
			<label
				htmlFor={id}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					onFile(e.dataTransfer.files[0] ?? null);
				}}
				className={cn(
					"flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50",
					dragging && "border-primary bg-primary/5",
				)}
			>
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Upload className="size-5 text-muted-foreground" />
				</div>
				<p className="font-medium">Trage fișierul aici sau apasă ca să alegi</p>
				<p className="text-sm text-muted-foreground">{hint}</p>
				<input
					id={id}
					type="file"
					accept={accept}
					className="sr-only"
					onChange={(e) => onFile(e.target.files?.[0] ?? null)}
				/>
			</label>

			{file && (
				<div className="flex items-center gap-3 rounded-lg border p-3">
					<FileText className="size-5 shrink-0 text-muted-foreground" />
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
						onClick={() => onFile(null)}
					>
						<X />
					</Button>
				</div>
			)}
		</div>
	);
}
