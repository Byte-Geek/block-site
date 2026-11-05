"use client";

import { startTransition, useState } from "react";
import { useActionWithToast } from "@/hooks/use-action-with-toast";

type State = { error?: string; ok?: string; details?: string[] };

export function useFileForm(
	action: (prev: State, formData: FormData) => Promise<State>,
	fields: Record<string, string> = {},
) {
	const [file, setFile] = useState<File | null>(null);
	const [state, formAction, pending] = useActionWithToast(action, () =>
		setFile(null),
	);

	function submit() {
		if (!file) return;
		const data = new FormData();
		for (const [name, value] of Object.entries(fields)) data.set(name, value);
		data.set("file", file);
		startTransition(() => formAction(data));
	}

	return { file, setFile, state, pending, submit };
}
