"use server";

import { revalidatePath } from "next/cache";
import { findAccessibleCase } from "@/lib/cases/accessible-case";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import {
	contentTypeOf,
	DOCUMENT_EXTENSIONS,
	fileProblem,
	matchesFileSignature,
	sanitizeFileName,
} from "@/lib/storage/file-rules";
import {
	deleteObjects,
	getObjectSize,
	readObjectStart,
} from "@/lib/storage/objects";
import { createUploadUrl } from "@/lib/storage/presigned-urls";

type State = { error?: string; ok?: string };

type UploadConfirmation = {
	number: number;
	key: string;
	name: string;
	note: string;
};

const MAX_NOTE_LENGTH = 500;
const unavailable = { error: "Cazul nu a fost găsit sau este anulat" };

async function findUploadableCase(number: number) {
	const found = await findAccessibleCase(number);
	return found && can(found.user.role, "file", "upload") ? found : null;
}

export async function requestAttachmentUpload(
	number: number,
	file: { name: string; size: number },
): Promise<{ error?: string; url?: string; key?: string }> {
	const found = await findUploadableCase(number);
	if (!found) return unavailable;

	const problem = fileProblem(file, DOCUMENT_EXTENSIONS);
	if (problem) return { error: problem };

	const key = `files/${found.c.id}/${found.user.id}/${crypto.randomUUID()}`;
	try {
		return { key, url: await createUploadUrl(key) };
	} catch (e) {
		console.error("S3 PRESIGN:", e);
		return { error: "Serverul de fișiere (S3) nu răspunde" };
	}
}

export async function confirmAttachmentUpload(
	input: UploadConfirmation,
): Promise<State> {
	const found = await findUploadableCase(input.number);
	if (!found) return unavailable;
	const { c, user } = found;
	if (!input.key.startsWith(`files/${c.id}/${user.id}/`))
		return { error: "Încărcare invalidă" };

	const note = input.note.trim();
	if (note.length > MAX_NOTE_LENGTH)
		return { error: "Descrierea poate avea cel mult 500 de caractere" };

	const size = await getObjectSize(input.key);
	if (size === null)
		return { error: "Fișierul nu a ajuns în S3. Încearcă din nou" };

	const problem =
		fileProblem({ name: input.name, size }, DOCUMENT_EXTENSIONS) ??
		(matchesFileSignature(input.name, await readObjectStart(input.key))
			? null
			: "Conținutul fișierului nu corespunde formatului ales");
	if (problem) {
		await deleteObjects([input.key]);
		return { error: problem };
	}

	const name = sanitizeFileName(input.name);
	try {
		await prisma.caseFile.create({
			data: {
				caseId: c.id,
				userId: user.id,
				key: input.key,
				name,
				size,
				contentType: contentTypeOf(name),
				kind: "attachment",
				note: note || null,
			},
		});
	} catch {
		return { error: "Fișierul a fost deja înregistrat" };
	}

	revalidatePath(`/cases/${c.number}`);
	return { ok: `Fișierul „${name}” a fost încărcat` };
}
