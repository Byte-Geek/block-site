"use client";

import { Ban, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	cancelCase,
	cancelDraft,
	resubmitCase,
	sendDraft,
} from "../_actions/lifecycle-actions";
import ConfirmActionDialog from "./confirm-action-dialog";
import ReplaceListDialog from "./replace-list-dialog";

type Props = {
	mode: "draft" | "rejected";
	number: number;
	domainCount: number;
	invalidCount: number;
};

export default function ListActionButtons({
	mode,
	number,
	domainCount,
	invalidCount,
}: Props) {
	const draft = mode === "draft";
	const verb = draft ? "trimiți" : "retrimiți";
	const blocked = domainCount === 0 || invalidCount > 0;
	const target = draft ? "ajung la ASP" : "revin la ASP";
	const sendText =
		domainCount === 1
			? `Domeniul ${draft ? "ajunge" : "revine"} la ASP.`
			: `Cele ${domainCount} domenii ${target}.`;

	return (
		<div className="flex flex-col gap-3">
			{domainCount === 0 && (
				<p className="text-sm text-muted-foreground">
					Lista este goală. Adaugă cel puțin un domeniu înainte să {verb}.
				</p>
			)}
			{invalidCount > 0 && (
				<p className="text-sm text-destructive">
					{invalidCount === 1
						? "Un domeniu are probleme."
						: `${invalidCount} domenii au probleme.`}{" "}
					Corectează-le sau șterge-le înainte să {verb}.
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<ConfirmActionDialog
					action={draft ? sendDraft : resubmitCase}
					number={number}
					trigger={
						<Button disabled={blocked}>
							<Send />
							{draft ? "Trimite" : "Retrimite"}
						</Button>
					}
					title={
						draft
							? "Trimiți lista la validare?"
							: "Retrimiți lista la validare?"
					}
					description={`${sendText} ${
						draft
							? "După trimitere nu mai poți modifica lista, decât dacă este respinsă."
							: "Nu o mai poți modifica decât dacă este respinsă din nou."
					}`}
					submitLabel={draft ? "Trimite" : "Retrimite"}
				/>

				<ReplaceListDialog number={number} domainCount={domainCount} />

				<ConfirmActionDialog
					action={draft ? cancelDraft : cancelCase}
					number={number}
					trigger={
						<Button variant="outline">
							{draft ? <Trash2 /> : <Ban />}
							{draft ? "Anulează" : "Anulează cazul"}
						</Button>
					}
					title={draft ? "Ștergi ciorna?" : "Anulezi cazul?"}
					description={
						draft
							? "Ciorna și toate domeniile ei se șterg definitiv."
							: "Procesul se oprește, iar cazul rămâne în istoric cu starea „Anulat”. Nu mai poate fi reluat."
					}
					submitLabel={draft ? "Șterge ciorna" : "Anulează cazul"}
					destructive
				/>
			</div>
		</div>
	);
}
