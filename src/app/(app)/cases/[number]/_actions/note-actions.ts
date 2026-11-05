"use server";

import { revalidatePath } from "next/cache";
import { findAccessibleCase } from "@/lib/cases/accessible-case";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

type State = { error?: string; ok?: string };

const MAX_NOTE_LENGTH = 2000;

export async function addNote(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const found = await findAccessibleCase(formData.get("number"));
	if (!found || !can(found.user.role, "note", "create"))
		return { error: "Cazul nu a fost găsit sau este anulat" };

	const text = String(formData.get("text") ?? "").trim();
	if (!text) return { error: "Scrie un comentariu" };
	if (text.length > MAX_NOTE_LENGTH)
		return { error: "Comentariul poate avea cel mult 2000 de caractere" };

	await prisma.caseNote.create({
		data: { caseId: found.c.id, userId: found.user.id, text },
	});

	revalidatePath(`/cases/${found.c.number}`);
	return { ok: "Comentariul a fost adăugat" };
}
