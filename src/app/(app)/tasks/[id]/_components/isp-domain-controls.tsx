"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	setAllBlocked,
	setDomainBlocked,
	setDomainReason,
} from "../_actions/isp-actions";

function report(result: { error?: string }) {
	if (result.error) toast.error(result.error);
}

export function IspSelectAllControl({
	taskId,
	allBlocked,
}: {
	taskId: string;
	allBlocked: boolean;
}) {
	const [pending, start] = useTransition();
	return (
		<div className="flex items-center justify-between gap-2">
			<span>Blocare</span>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={pending}
				onClick={() =>
					start(async () => report(await setAllBlocked(taskId, !allBlocked)))
				}
			>
				{allBlocked ? "Deselectează toate" : "Selectează toate"}
			</Button>
		</div>
	);
}

type Props = {
	taskId: string;
	domainId: string;
	blocked: boolean;
	reason: string | null;
};

export function IspDomainControl({ taskId, domainId, blocked, reason }: Props) {
	const [pending, start] = useTransition();
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(reason ?? "");

	function saveReason() {
		start(async () => {
			const result = await setDomainReason(taskId, domainId, text);
			if (result.error) toast.error(result.error);
			else setEditing(false);
		});
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center gap-2">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						className="size-4"
						checked={blocked}
						disabled={pending}
						onChange={(e) =>
							start(async () =>
								report(
									await setDomainBlocked(taskId, domainId, e.target.checked),
								),
							)
						}
					/>
					Blocat
				</label>
				{!blocked && !editing && (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => {
							setText(reason ?? "");
							setEditing(true);
						}}
					>
						{reason ? "Schimbă cauza" : "Nu poate fi blocat"}
					</Button>
				)}
			</div>

			{!blocked && reason && !editing && (
				<p className="text-xs wrap-break-word text-amber-700">{reason}</p>
			)}

			{editing && (
				<div className="flex gap-1">
					<Input
						autoFocus
						value={text}
						placeholder="De ce nu poate fi blocat"
						onChange={(e) => setText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") saveReason();
							if (e.key === "Escape") setEditing(false);
						}}
					/>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="Salvează cauza"
						disabled={pending}
						onClick={saveReason}
					>
						<Check />
					</Button>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="Renunță"
						onClick={() => setEditing(false)}
					>
						<X />
					</Button>
				</div>
			)}
		</div>
	);
}
