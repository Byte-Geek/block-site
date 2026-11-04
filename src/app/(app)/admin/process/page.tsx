import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import UploadProcessForm from "./_components/upload-process-form";

export default async function ProcessPage() {
	await requireAdmin();
	const versions = await prisma.processVersion.findMany({
		orderBy: { createdAt: "desc" },
	});

	return (
		<PageShell className="max-w-3xl">
			<PageHeader
				title="Schema procesului"
				description="Fluxul de lucru (BPMN) după care circulă cazurile."
			/>

			<Card>
				<CardHeader>
					<CardTitle>Versiune nouă</CardTitle>
					<CardDescription>
						Încarcă un fișier BPMN. Se publică în Flowable ca versiune nouă.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<UploadProcessForm />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Versiuni încărcate</CardTitle>
				</CardHeader>
				<CardContent>
					{versions.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nu există încă nicio versiune încărcată din platformă.
						</p>
					) : (
						<ul className="divide-y rounded-lg border">
							{versions.map((v, i) => (
								<li
									key={v.id}
									className="flex items-center justify-between gap-4 p-4"
								>
									<div className="min-w-0">
										<p className="text-sm font-medium">
											{formatDateTime(v.createdAt)}
										</p>
										<p className="truncate font-mono text-xs text-muted-foreground">
											{v.deploymentId}
										</p>
									</div>
									{i === 0 && <Badge>Curentă</Badge>}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}
