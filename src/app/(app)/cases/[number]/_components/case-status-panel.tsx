import CaseStepper from "@/components/cases/case-stepper";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import DraftActions from "./draft-actions";
import RejectedActions from "./rejected-actions";

type Props = {
	stage: string;
	isInitiator: boolean;
	number: number;
	domainCount: number;
	invalidCount: number;
	rejection: { stage: string; text: string | null; createdAt: Date } | null;
};


export default function CaseStatusPanel({
	stage,
	isInitiator,
	number,
	domainCount,
	invalidCount,
	rejection,
}: Props) {
	if (isInitiator && stage === "draft")
		return (
			<Card className="border-primary/30 bg-primary/5">
				<CardHeader>
					<CardTitle>Ciornă, încă netrimisă</CardTitle>
					<CardDescription>
						Verifică lista, apoi trimite-o la validarea ASP. Ciorna o vezi doar
						tu și o poți șterge oricând până o trimiți.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DraftActions
						number={number}
						domainCount={domainCount}
						invalidCount={invalidCount}
					/>
				</CardContent>
			</Card>
		);

	return (
		<>
			{isInitiator && stage === "initiator" && (
				<Card className="border-amber-300 bg-amber-50/50">
					<CardHeader>
						<CardTitle>Lista trebuie corectată</CardTitle>
						<CardDescription>
							Corectează domeniile direct în tabel, apoi retrimite lista. Poți
							și să o înlocuiești cu un fișier nou sau să anulezi cazul.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{rejection && (
							<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
								<p className="font-medium text-destructive">
									Respins de {rejection.stage === "asp" ? "ASP" : "ANRCETI"}
								</p>
								{rejection.text && <p className="mt-1">{rejection.text}</p>}
								<p className="mt-1 text-xs text-muted-foreground">
									{formatDateTime(rejection.createdAt)}
								</p>
							</div>
						)}
						<RejectedActions
							number={number}
							domainCount={domainCount}
							invalidCount={invalidCount}
						/>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent
					className={
						stage === "cancelled" ? "text-sm text-muted-foreground" : ""
					}
				>
					{stage === "cancelled" ? (
						"Cazul a fost anulat de inițiator. Procesul s-a oprit, iar lista nu mai poate fi modificată."
					) : (
						<CaseStepper stage={stage} />
					)}
				</CardContent>
			</Card>
		</>
	);
}
