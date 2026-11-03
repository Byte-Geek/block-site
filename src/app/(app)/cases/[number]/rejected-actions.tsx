"use client";

import { Ban, Send } from "lucide-react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cancelCase, resubmitCase } from "./actions";
import ConfirmBody from "./confirm-body";
import ReplaceDialog from "./replace-dialog";

type Props = { number: number; domainCount: number; invalidCount: number };

export default function RejectedActions({
	number,
	domainCount,
	invalidCount,
}: Props) {
	const blocked = domainCount === 0 || invalidCount > 0;
	const sendText =
		domainCount === 1
			? "Domeniul revine la ASP."
			: `Cele ${domainCount} domenii revin la ASP.`;

	return (
		<div className="flex flex-col gap-3">
			{domainCount === 0 && (
				<p className="text-sm text-muted-foreground">
					Lista este goală. Adaugă cel puțin un domeniu înainte să retrimiți.
				</p>
			)}
			{invalidCount > 0 && (
				<p className="text-sm text-destructive">
					{invalidCount === 1
						? "Un domeniu are probleme."
						: `${invalidCount} domenii au probleme.`}{" "}
					Corectează-le sau șterge-le înainte să retrimiți.
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button disabled={blocked}>
							<Send />
							Retrimite
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<ConfirmBody
							action={resubmitCase}
							number={number}
							title="Retrimiți lista la validare?"
							description={`${sendText} Nu o mai poți modifica decât dacă este respinsă din nou.`}
							submitLabel="Retrimite"
						/>
					</AlertDialogContent>
				</AlertDialog>

				<ReplaceDialog number={number} domainCount={domainCount} />

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline">
							<Ban />
							Anulează cazul
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<ConfirmBody
							action={cancelCase}
							number={number}
							title="Anulezi cazul?"
							description="Procesul se oprește, iar cazul rămâne în istoric cu starea „Anulat”. Nu mai poate fi reluat."
							submitLabel="Anulează cazul"
							destructive
						/>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}
