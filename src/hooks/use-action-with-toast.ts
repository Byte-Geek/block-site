"use client";

import { useActionState } from "react";
import { toast } from "sonner";

type State = { error?: string; ok?: string; details?: string[] };

export function useActionWithToast(
	action: (prev: State, formData: FormData) => Promise<State>,
	onSuccess?: (result: State) => void,
) {
	return useActionState(async (prev: State, formData: FormData) => {
		const result = await action(prev, formData);
		if (result.ok) {
			toast.success(result.ok);
			onSuccess?.(result);
		}
		return result;
	}, {} as State);
}
