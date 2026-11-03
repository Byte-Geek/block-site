"use client";

import { startTransition, useActionState, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import FileDropzone from "@/components/file-dropzone";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { replaceFromFile } from "./actions";

type State = { error?: string; details?: string[] };
type Props = { number: number; domainCount: number };

function ReplaceForm({ number, domainCount }: Props) {
	const [state, action, pending] = useActionState(replaceFromFile, {} as State);
	const [file, setFile] = useState<File | null>(null);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (!file) return;
				const data = new FormData();
				data.set("number", String(number));
				data.set("file", file);
				startTransition(() => action(data));
			}}
			className="flex flex-col gap-4"
		>
			<DialogHeader>
				<DialogTitle>Înlocuiește lista cu un fișier</DialogTitle>
				<DialogDescription>
					Lista curentă ({domainCount} domenii, cu modificările tale) se
					înlocuiește complet cu cea din fișier. Nu se trimite nimic: verifici
					lista înainte.
				</DialogDescription>
			</DialogHeader>

			<FileDropzone
				id="replace-file"
				file={file}
				onFile={setFile}
				accept=".xlsx"
				hint="Format .xlsx"
			/>

			<FormError details={state.details}>{state.error}</FormError>

			<DialogFooter>
				<DialogClose asChild>
					<Button type="button" variant="outline" disabled={pending}>
						Renunță
					</Button>
				</DialogClose>
				<Button type="submit" disabled={!file || pending}>
					{pending && <LoaderCircle className="animate-spin" />}
					Înlocuiește lista
				</Button>
			</DialogFooter>
		</form>
	);
}

export default function ReplaceDialog(props: Props) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button type="button" variant="outline">
					<FileUp />
					Înlocuiește cu un fișier
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<ReplaceForm {...props} />
			</DialogContent>
		</Dialog>
	);
}
