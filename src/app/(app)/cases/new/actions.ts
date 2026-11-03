"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDomains } from "@/lib/domains";
import { prisma } from "@/lib/prisma";
import { requireGroup } from "@/lib/require-group";
import { deleteFiles, storeFile } from "@/lib/storage";

type State = { error?: string; details?: string[] };

export async function createDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const file = formData.get("file") as File;
	const parsed = await parseDomains(file);
	if ("error" in parsed)
		return { error: parsed.error, details: parsed.details };
	const { domains, removedDuplicates, column } = parsed;

	const stored = await storeFile(file);
	if ("error" in stored) return { error: stored.error };

	let created: { number: number };
	try {
		created = await prisma.$transaction(
			async (tx) => {
				const c = await tx.case.create({
					data: {
						fileName: file.name,
						createdById: user.id,
						stage: "draft",
					},
				});
				await tx.caseDomain.createMany({
					data: domains.map((value, i) => ({
						caseId: c.id,
						position: i + 1,
						value,
					})),
				});
				await tx.caseFile.create({
					data: {
						...stored.data,
						caseId: c.id,
						userId: user.id,
						kind: "list",
					},
				});
				return c;
			},
			{ timeout: 60000 },
		);
	} catch (e) {
		await deleteFiles([stored.data.key]);
		throw e;
	}

	revalidatePath("/cases");
	redirect(
		`/cases/${created.number}?ok=draft&col=${column}${removedDuplicates > 0 ? `&dup=${removedDuplicates}` : ""}`,
	);
}

export async function createEmptyDraft(
	_prev: State,
	_formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const created = await prisma.case.create({
		data: {
			fileName: "Introdus manual",
			createdById: user.id,
			stage: "draft",
		},
	});

	revalidatePath("/cases");
	redirect(`/cases/${created.number}?ok=draft`);
}
