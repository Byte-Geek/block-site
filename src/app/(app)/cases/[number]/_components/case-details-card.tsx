import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { initiator: string; fileName: string; domainCount: number };

export default function CaseDetailsCard({
	initiator,
	fileName,
	domainCount,
}: Props) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Detalii</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-3 text-sm">
					<div className="flex justify-between gap-4">
						<dt className="shrink-0 text-muted-foreground">Inițiator</dt>
						<dd className="min-w-0 text-right font-medium wrap-break-word">
							{initiator}
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="shrink-0 text-muted-foreground">Fișier</dt>
						<dd className="min-w-0 text-right font-medium break-all">
							{fileName}
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="shrink-0 text-muted-foreground">Domenii</dt>
						<dd className="font-medium tabular-nums">{domainCount}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
