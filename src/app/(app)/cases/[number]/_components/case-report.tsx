import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { IspFailures } from "@/lib/cases/case-report";

type Props = {
	total: number;
	blockedByAll: number;
	ispCount: number;
	failures: IspFailures[];
};

const fmt = (n: number) => n.toLocaleString("ro-RO");

export default function CaseReport({
	total,
	blockedByAll,
	ispCount,
	failures,
}: Props) {
	const withFailures = failures.filter((f) => f.rows.length > 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Raport final</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<p>
					Au fost blocate{" "}
					<span className="font-semibold">{fmt(blockedByAll)}</span> din{" "}
					{fmt(total)} domenii
					{ispCount > 1 ? ", de toate ISP-urile" : ""}.
				</p>

				{withFailures.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Toate domeniile au fost blocate.
					</p>
				) : (
					<div className="flex flex-col gap-4">
						<h3 className="font-semibold">Nu au putut fi blocate:</h3>
						{withFailures.map((f) => (
							<div key={f.id} className="flex flex-col gap-2">
								<p className="text-sm font-medium">
									{f.name}{" "}
									<span className="font-normal text-muted-foreground">
										· {fmt(f.rows.length)}{" "}
										{f.rows.length === 1 ? "domeniu" : "domenii"}
									</span>
								</p>
								<div className="max-h-96 overflow-auto rounded-lg border">
									<Table className="table-fixed">
										<TableHeader>
											<TableRow>
												<TableHead className="w-1/2">Domeniu</TableHead>
												<TableHead>De ce nu a putut fi blocat</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{f.rows.map((r) => (
												<TableRow key={r.id}>
													<TableCell className="font-mono text-sm break-all whitespace-normal">
														{r.value}
													</TableCell>
													<TableCell className="break-words whitespace-normal">
														{r.reason}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
