"use server";

import { revalidatePath } from "next/cache";
import { caseAccess } from "@/lib/case-access";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { deleteFiles, storeFile } from "@/lib/storage";

type State = { error?: string; ok?: string };

async function openCase(number: number) {
	const user = await requireUser();
	const access = caseAccess(user);
	if (
		!access ||
		!Number.isInteger(number) ||
		number < 1 ||
		number > 2147483647
	)
		return null;
	const c = await prisma.case.findFirst({
		where: { AND: [access.where, { number }] },
	});
	if (!c || c.stage === "cancelled") return null;
	return { user, c };
}

const missing = { error: "Cazul nu a fost găsit sau este anulat" };

export async function addNote(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const t = await openCase(Number(formData.get("number")));
	if (!t) return missing;

	const text = String(formData.get("text") ?? "").trim();
	if (!text) return { error: "Scrie un comentariu" };
	if (text.length > 2000)
		return { error: "Comentariul poate avea cel mult 2000 de caractere" };

	await prisma.caseNote.create({
		data: { caseId: t.c.id, userId: t.user.id, text },
	});

	revalidatePath(`/cases/${t.c.number}`);
	return { ok: "Comentariul a fost adăugat" };
}

export async function uploadFile(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const t = await openCase(Number(formData.get("number")));
	if (!t) return missing;

	const file = formData.get("file");
	if (!(file instanceof File) || file.size === 0)
		return { error: "Alege un fișier" };
	const note = String(formData.get("note") ?? "").trim();
	if (note.length > 500)
		return { error: "Descrierea poate avea cel mult 500 de caractere" };

	const stored = await storeFile(file);
	if ("error" in stored) return { error: stored.error };

	try {
		await prisma.caseFile.create({
			data: {
				...stored.data,
				caseId: t.c.id,
				userId: t.user.id,
				kind: "attachment",
				note: note || null,
			},
		});
	} catch (e) {
		await deleteFiles([stored.data.key]);
		throw e;
	}

	revalidatePath(`/cases/${t.c.number}`);
	return { ok: `Fișierul „${stored.data.name}” a fost încărcat` };
}
