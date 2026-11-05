"use client";

import { FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/format";
import { fileProblem, MAX_FILE_SIZE_LABEL } from "@/lib/storage/file-rules";
import { cn } from "@/lib/utils";

type Props = {
	id: string;
	file: File | null;
	onFile: (file: File | null) => void;
	extensions: string[];
};

export default function FileDropzone({ id, file, onFile, extensions }: Props) {
	const [dragging, setDragging] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);

	function select(selected: File | null) {
		const error = selected ? fileProblem(selected, extensions) : null;
		setProblem(error);
		onFile(error ? null : selected);
	}

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
					select(e.dataTransfer.files[0] ?? null);
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
				<p className="text-sm text-muted-foreground">
					Format {extensions.join(", ")} · maximum {MAX_FILE_SIZE_LABEL}
				</p>
				<input
					id={id}
					type="file"
					accept={extensions.join(",")}
					className="sr-only"
					onChange={(e) => {
						select(e.target.files?.[0] ?? null);
						e.target.value = "";
					}}
				/>
			</label>

			<FormError>{problem}</FormError>

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
