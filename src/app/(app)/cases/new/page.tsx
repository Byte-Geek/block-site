import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { requireGroup } from "@/lib/require-group";
import EmptyDraftButton from "./empty-draft-button";
import UploadForm from "./upload-form";

export default async function NewCasePage() {
	await requireGroup("initiator");

	return (
		<PageShell className="max-w-4xl">
			<PageHeader
				back={
					<Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
						<Link href="/cases">
							<ChevronLeft />
							Cazuri
						</Link>
					</Button>
				}
				title="Listă nouă"
				description="Începe cu un fișier sau direct în platformă. Nimic nu se trimite până nu verifici lista și apeși Trimite."
			/>

			<div className="grid gap-6 md:grid-cols-[2fr_1fr] md:items-start">
				<Card>
					<CardHeader>
						<CardTitle>Încarcă un fișier</CardTitle>
						<CardDescription>
							Lista se citește și apare ca ciornă, pe care o poți verifica.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<UploadForm />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Fără fișier</CardTitle>
						<CardDescription>
							Pornești cu o listă goală și adaugi domeniile direct în tabel.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<EmptyDraftButton />
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Cum se citește fișierul</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
						<li>Un domeniu pe rând, în prima foaie a fișierului.</li>
						<li>
							Dacă un rând are mai multe celule, se citește ultima celulă
							completă.
						</li>
						<li>Antetul „Domeniu” sau „Domain” de pe primul rând se ignoră.</li>
						<li>
							Domeniile se salvează cu litere mici, iar duplicatele se elimină
							automat.
						</li>
					</ul>
				</CardContent>
			</Card>
		</PageShell>
	);
}
