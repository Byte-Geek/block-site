"use client";

import { HandHelping, LoaderCircle, UserCheck } from "lucide-react";
import { claimTask, releaseTask } from "@/actions/task-assignment-actions";
import { FormError } from "@/components/common/form-error";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useActionWithToast } from "@/hooks/use-action-with-toast";

type Props = { taskId: string; mine: boolean };

export default function TaskAssignmentCard({ taskId, mine }: Props) {
	const [claimState, claim, claiming] = useActionWithToast(claimTask);
	const [releaseState, release, releasing] = useActionWithToast(releaseTask);

	if (!mine) {
		return (
			<Card className="border-primary/30 bg-primary/5">
				<CardHeader>
					<CardTitle>Sarcină liberă</CardTitle>
					<CardDescription>
						Preia sarcina ca să o poți rezolva. Până atunci poți vedea lista de
						domenii, dar nu poți decide.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={claim} className="flex flex-col gap-3">
						<input type="hidden" name="taskId" value={taskId} />
						<FormError>{claimState.error}</FormError>
						<Button type="submit" disabled={claiming}>
							{claiming ? (
								<LoaderCircle className="animate-spin" />
							) : (
								<HandHelping />
							)}
							Preia sarcina
						</Button>
					</form>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
				<div className="flex items-center gap-2 text-sm">
					<UserCheck className="size-4 text-primary" />
					Sarcina este a ta
				</div>
				<form action={release}>
					<input type="hidden" name="taskId" value={taskId} />
					<Button
						type="submit"
						variant="outline"
						size="sm"
						disabled={releasing}
					>
						{releasing && <LoaderCircle className="animate-spin" />}
						Eliberează
					</Button>
				</form>
			</div>
			<FormError>{releaseState.error}</FormError>
		</div>
	);
}
