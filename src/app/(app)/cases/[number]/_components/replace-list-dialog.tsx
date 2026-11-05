"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import FileDropzone from "@/components/common/file-dropzone";
import { FormError } from "@/components/common/form-error";
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
import { useFileForm } from "@/hooks/use-file-form";
import { SPREADSHEET_EXTENSIONS } from "@/lib/storage/file-rules";
import { replaceFromFile } from "../_actions/domain-actions";

type Props = { number: number; domainCount: number };

function ReplaceListForm({ number, domainCount }: Props) {
	const { file, setFile, state, pending, submit } = useFileForm(
		replaceFromFile,
		{ number: String(number) },
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				submit();
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
				extensions={SPREADSHEET_EXTENSIONS}
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

export default function ReplaceListDialog(props: Props) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button type="button" variant="outline">
					<FileUp />
					Înlocuiește cu un fișier
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<ReplaceListForm {...props} />
			</DialogContent>
		</Dialog>
	);
}
