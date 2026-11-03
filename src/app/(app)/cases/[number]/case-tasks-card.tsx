import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReleaseButton from "./release-button";

type Row = {
	id: string;
	name: string;
	status: string;
	assigneeName: string | null;
};

export default function CaseTasksCard({
	rows,
	canRelease,
}: {
	rows: Row[];
	canRelease: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Sarcini active</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-4">
					{rows.map((r) => (
						<li
							key={r.id}
							className="flex items-center justify-between gap-3 text-sm"
						>
							<div className="min-w-0">
								<p className="font-medium">{r.name}</p>
								<p className="text-xs text-muted-foreground">{r.status}</p>
							</div>
							{canRelease && r.assigneeName && (
								<ReleaseButton taskId={r.id} assigneeName={r.assigneeName} />
							)}
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
