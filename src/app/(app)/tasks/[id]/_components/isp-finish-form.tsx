"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { finishIspTask } from "../_actions/isp-actions";

type Props = {
	taskId: string;
	total: number;
	blocked: number;
	withReason: number;
};

export default function IspFinishForm({
	taskId,
	total,
	blocked,
	withReason,
}: Props) {
	const [state, action, pending] = useActionState(finishIspTask, {});
	const left = total - blocked - withReason;

	return (
		<form action={action} className="flex flex-col gap-3">
			<input type="hidden" name="taskId" value={taskId} />
			<dl className="grid gap-1 text-sm">
				<div className="flex justify-between">
					<dt className="text-muted-foreground">Blocate</dt>
					<dd className="font-medium tabular-nums">{blocked}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-muted-foreground">
						Cu cauză (nu pot fi blocate)
					</dt>
					<dd className="font-medium tabular-nums">{withReason}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-muted-foreground">Nemarcate</dt>
					<dd className="font-medium tabular-nums">{left}</dd>
				</div>
			</dl>
			{left > 0 && (
				<p className="text-xs text-muted-foreground">
					Bifează „Blocat” sau scrie cauza la fiecare domeniu. Abia apoi poți
					finaliza.
				</p>
			)}
			<FormError>{state.error}</FormError>
			<Button type="submit" disabled={left > 0 || pending}>
				{pending && <LoaderCircle className="animate-spin" />}
				Finalizează
			</Button>
		</form>
	);
}
