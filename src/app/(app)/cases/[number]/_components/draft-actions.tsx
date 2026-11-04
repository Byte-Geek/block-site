"use client";

import { Send, Trash2 } from "lucide-react";
import {
	cancelDraft,
	sendDraft,
} from "@/app/(app)/cases/[number]/_actions/actions";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import ConfirmBody from "./confirm-body";
import ReplaceDialog from "./replace-dialog";

type Props = { number: number; domainCount: number; invalidCount: number };

export default function DraftActions({
	number,
	domainCount,
	invalidCount,
}: Props) {
	const blocked = domainCount === 0 || invalidCount > 0;
	const sendText =
		domainCount === 1
			? "Domeniul ajunge la ASP."
			: `Cele ${domainCount} domenii ajung la ASP.`;

	return (
		<div className="flex flex-col gap-3">
			{domainCount === 0 && (
				<p className="text-sm text-muted-foreground">
					Lista este goală. Adaugă cel puțin un domeniu înainte să
					trimiți.
				</p>
			)}
			{invalidCount > 0 && (
				<p className="text-sm text-destructive">
					{invalidCount === 1
						? "Un domeniu are probleme."
						: `${invalidCount} domenii au probleme.`}{" "}
					Corectează-le sau șterge-le înainte să trimiți.
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button disabled={blocked}>
							<Send />
							Trimite
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<ConfirmBody
							action={sendDraft}
							number={number}
							title="Trimiți lista la validare?"
							description={`${sendText} După trimitere nu mai poți modifica lista, decât dacă este respinsă.`}
							submitLabel="Trimite"
						/>
					</AlertDialogContent>
				</AlertDialog>

				<ReplaceDialog number={number} domainCount={domainCount} />

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline">
							<Trash2 />
							Anulează
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<ConfirmBody
							action={cancelDraft}
							number={number}
							title="Ștergi ciorna?"
							description="Ciorna și toate domeniile ei se șterg definitiv."
							submitLabel="Șterge ciorna"
							destructive
						/>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
