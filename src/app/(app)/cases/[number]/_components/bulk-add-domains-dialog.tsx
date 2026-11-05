"use client";

import { ListPlus } from "lucide-react";
import FormDialog from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addDomains } from "../_actions/domain-actions";

export default function BulkAddDomainsDialog({ number }: { number: number }) {
	return (
		<FormDialog
			trigger={
				<Button type="button" variant="outline">
					<ListPlus />
					Adaugă mai multe
				</Button>
			}
			title="Adaugă mai multe domenii"
			description="Lipește domeniile, câte unul pe rând sau separate prin virgulă. Cele care există deja se omit."
			submitLabel="Adaugă"
			action={addDomains}
		>
			<input type="hidden" name="number" value={number} />
			<Textarea
				name="text"
				rows={10}
				placeholder={"exemplu.md\nalt-exemplu.com"}
				className="font-mono text-sm"
				required
			/>
		</FormDialog>
	);
}
