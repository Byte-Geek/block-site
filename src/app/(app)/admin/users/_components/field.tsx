import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = ComponentProps<typeof Input> & { label: string; hint?: string };

export function Field({ label, hint, id, ...props }: Props) {
	const fieldId = id ?? props.name;

	return (
		<div className="grid gap-2">
			<Label htmlFor={fieldId}>{label}</Label>
			<Input id={fieldId} {...props} />
			{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
		</div>
	);
}
