"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionWithToast } from "@/hooks/use-action-with-toast";
import {
	finalIspStatuses,
	ispStatuses,
	ispStatusLabels,
} from "@/lib/cases/constants";
import { setIspStatus } from "../_actions/isp-actions";

type Props = { taskId: string; initialStatus: string };

export default function IspStatusForm({ taskId, initialStatus }: Props) {
	const [state, action, pending] = useActionWithToast(setIspStatus);
	const [status, setStatus] = useState(
		finalIspStatuses.includes(initialStatus) ? "queued" : initialStatus,
	);

	return (
		<form action={action} className="flex flex-col gap-4">
			<input type="hidden" name="taskId" value={taskId} />

			<div className="grid gap-2">
				<Label htmlFor="isp-status">Stare nouă</Label>
				<Select name="status" value={status} onValueChange={setStatus}>
					<SelectTrigger id="isp-status" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ispStatuses
							.filter((s) => !finalIspStatuses.includes(s))
							.map((s) => (
								<SelectItem key={s} value={s}>
									{ispStatusLabels[s]}
								</SelectItem>
							))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="isp-reason">Notă (opțional)</Label>
				<Textarea id="isp-reason" name="reason" rows={3} />
			</div>

			<FormError>{state.error}</FormError>

			<Button type="submit" disabled={pending}>
				{pending && <LoaderCircle className="animate-spin" />}
				Salvează starea
			</Button>
		</form>
	);
}
