"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { caseAccess } from "@/lib/cases/access";
import { parseCaseNumber } from "@/lib/cases/number";
import { prisma } from "@/lib/prisma";
import {
	cleanFileName,
	deleteFiles,
	MAX_FILE_SIZE,
	objectSize,
	presignUpload,
} from "@/lib/storage";

type State = { error?: string; ok?: string };

async function openCase(value: unknown) {
	const user = await requireUser();
	const access = caseAccess(user);
	const number = parseCaseNumber(value);
	if (!access || !number) return null;
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
	const t = await openCase(formData.get("number"));
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

export async function requestUpload(
	number: number,
	size: number,
): Promise<{ error?: string; url?: string; key?: string }> {
	const t = await openCase(number);
	if (!t) return missing;
	if (!(size > 0)) return { error: "Fișierul este gol" };
	if (size > MAX_FILE_SIZE) return { error: "Fișierul depășește 25 MB" };

	const key = `files/${t.c.id}/${t.user.id}/${crypto.randomUUID()}`;
	try {
		return { key, url: await presignUpload(key) };
	} catch (e) {
		console.error("S3 PRESIGN:", e);
		return { error: "Serverul de fișiere (S3) nu răspunde" };
	}
}

type Upload = {
	number: number;
	key: string;
	name: string;
	contentType: string;
	note: string;
};

export async function confirmUpload(input: Upload): Promise<State> {
	const t = await openCase(input.number);
	if (!t) return missing;
	if (!input.key.startsWith(`files/${t.c.id}/${t.user.id}/`))
		return { error: "Încărcare invalidă" };

	const note = input.note.trim();
	if (note.length > 500)
		return { error: "Descrierea poate avea cel mult 500 de caractere" };

	const size = await objectSize(input.key);
	if (size === null)
		return { error: "Fișierul nu a ajuns în S3. Încearcă din nou" };
	if (size === 0 || size > MAX_FILE_SIZE) {
		await deleteFiles([input.key]);
		return {
			error: size === 0 ? "Fișierul este gol" : "Fișierul depășește 25 MB",
		};
	}

	const name = cleanFileName(input.name);
	try {
		await prisma.caseFile.create({
			data: {
				caseId: t.c.id,
				userId: t.user.id,
				key: input.key,
				name,
				size,
				contentType: input.contentType || "application/octet-stream",
				kind: "attachment",
				note: note || null,
			},
		});
	} catch {
		return { error: "Fișierul a fost deja înregistrat" };
	}

	revalidatePath(`/cases/${t.c.number}`);
	return { ok: `Fișierul „${name}” a fost încărcat` };
}
