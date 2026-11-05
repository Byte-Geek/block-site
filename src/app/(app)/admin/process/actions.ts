"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-permission";
import { prisma } from "@/lib/prisma";
import { flowableDeploy } from "@/lib/workflow/flowable";

type State = { error?: string; ok?: string };

export async function uploadProcess(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requirePermission("process", "manage");
	const file = formData.get("file") as File;
	if (!file || file.size === 0) return { error: "Alege un fișier" };
	const xml = await file.text();

	try {
		const deployment = await flowableDeploy(xml);
		await prisma.processVersion.create({
			data: { xml, deploymentId: deployment.id },
		});
	} catch (e) {
		console.error("DEPLOY:", e);
		return { error: "Schema nu a putut fi încărcată. Verifică fișierul" };
	}

	revalidatePath("/admin/process");
	return { ok: "Schema a fost încărcată" };
}
