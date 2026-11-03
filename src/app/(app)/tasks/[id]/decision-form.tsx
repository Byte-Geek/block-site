"use client";

import { useActionState, useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decide } from "./actions";

const approveText = {
	asp: "Lista va fi trimisă la validarea ANRCETI.",
	anr: "Lista va fi trimisă ISP-urilor pentru blocare.",
};

const rejectText = {
	asp: "Cazul se întoarce la inițiator, împreună cu comentariul tău.",
	anr: "Cazul se întoarce la ASP, împreună cu comentariul tău.",
};

type Props = { taskId: string; stage: "asp" | "anr" };

export default function DecisionForm({ taskId, stage }: Props) {
	const [state, action, pending] = useActionState(decide, {});
	const [text, setText] = useState("");
	const [localError, setLocalError] = useState("");
	const [rejectOpen, setRejectOpen] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);
	const approveRef = useRef<HTMLButtonElement>(null);
	const rejectRef = useRef<HTMLButtonElement>(null);

	function askReject() {
		if (!text.trim()) {
			setLocalError("La respingere comentariul este obligatoriu");
			return;
		}
		setLocalError("");
		setRejectOpen(true);
	}

	return (
		<form ref={formRef} action={action} className="flex flex-col gap-4">
			<input type="hidden" name="taskId" value={taskId} />
			<button
				type="submit"
				name="decision"
				value="da"
				ref={approveRef}
				hidden
			/>
			<button type="submit" name="decision" value="nu" ref={rejectRef} hidden />

			<div className="grid gap-2">
				<Label htmlFor="decision-text">Comentariu</Label>
				<Textarea
					id="decision-text"
					name="text"
					rows={4}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setLocalError("");
					}}
					placeholder="Obligatoriu la respingere"
				/>
			</div>

			<FormError>{localError || state.error}</FormError>

			<div className="grid grid-cols-2 gap-2">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							disabled={pending}
							className="bg-green-600 text-white hover:bg-green-700"
						>
							Aprobă
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Aprobi lista?</AlertDialogTitle>
							<AlertDialogDescription>
								{approveText[stage]} Decizia nu poate fi anulată.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Anulează</AlertDialogCancel>
							<AlertDialogAction
								onClick={() =>
									formRef.current?.requestSubmit(approveRef.current)
								}
							>
								Aprobă
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Button
					type="button"
					variant="destructive"
					disabled={pending}
					onClick={askReject}
				>
					Respinge
				</Button>
				<AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Respingi lista?</AlertDialogTitle>
							<AlertDialogDescription>
								{rejectText[stage]} Decizia nu poate fi anulată.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Anulează</AlertDialogCancel>
							<AlertDialogAction
								onClick={() =>
									formRef.current?.requestSubmit(rejectRef.current)
								}
							>
								Respinge
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</form>
	);
}
