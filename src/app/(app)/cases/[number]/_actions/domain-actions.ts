"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { domainProblem, normalizeDomain } from "@/lib/cases/domain-format";
import { listLoadedParams, parseDomains } from "@/lib/cases/domain-list-parser";
import { findEditableCase } from "@/lib/cases/own-case";
import { prisma } from "@/lib/prisma";
import { deleteObjects, storeListFile } from "@/lib/storage/objects";

type State = { error?: string; ok?: string; details?: string[] };

const locked = { error: "Lista nu mai poate fi modificată" };
const MAX_DOMAINS_PER_PASTE = 20000;
const MAX_PROBLEMS_SHOWN = 100;

async function nextPosition(caseId: string) {
	const last = await prisma.caseDomain.aggregate({
		where: { caseId },
		_max: { position: true },
	});
	return (last._max.position ?? 0) + 1;
}

export async function updateDomain(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const editable = await findEditableCase(formData);
	if (!editable) return locked;
	const { c } = editable;

	const id = String(formData.get("id"));
	const value = normalizeDomain(String(formData.get("value") ?? ""));
	const problem = domainProblem(value);
	if (problem) return { error: problem };

	const row = await prisma.caseDomain.findFirst({
		where: { id, caseId: c.id },
	});
	if (!row) return { error: "Domeniul nu a fost găsit" };
	if (row.value === value) return { ok: "Salvat" };

	const clash = await prisma.caseDomain.findFirst({
		where: { caseId: c.id, value },
	});
	if (clash) return { error: "Domeniul există deja în listă" };

	await prisma.caseDomain.update({ where: { id: row.id }, data: { value } });

	revalidatePath(`/cases/${c.number}`);
	return { ok: "Salvat" };
}

export async function addDomain(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const editable = await findEditableCase(formData);
	if (!editable) return locked;
	const { c } = editable;

	const value = normalizeDomain(String(formData.get("value") ?? ""));
	const problem = domainProblem(value);
	if (problem) return { error: problem };

	const exists = await prisma.caseDomain.findFirst({
		where: { caseId: c.id, value },
	});
	if (exists) return { error: "Domeniul există deja în listă" };

	await prisma.caseDomain.create({
		data: { caseId: c.id, position: await nextPosition(c.id), value },
	});

	revalidatePath(`/cases/${c.number}`);
	return { ok: `Adăugat: ${value}` };
}

export async function addDomains(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const editable = await findEditableCase(formData);
	if (!editable) return locked;
	const { c } = editable;

	const tokens = String(formData.get("text") ?? "")
		.split(/[\s,;]+/)
		.map(normalizeDomain)
		.filter(Boolean);
	if (tokens.length === 0) return { error: "Lipește cel puțin un domeniu" };
	if (tokens.length > MAX_DOMAINS_PER_PASTE)
		return { error: "Maximum 20.000 de domenii o dată" };

	const unique = [...new Set(tokens)];
	const problems = unique.flatMap((d) => {
		const p = domainProblem(d);
		return p ? [`${d}: ${p}`] : [];
	});
	if (problems.length > 0)
		return {
			error: `${problems.length} ${problems.length === 1 ? "domeniu nu este valid" : "domenii nu sunt valide"}. Nu s-a adăugat nimic.`,
			details: problems.slice(0, MAX_PROBLEMS_SHOWN),
		};

	const existing = await prisma.caseDomain.findMany({
		where: { caseId: c.id, value: { in: unique } },
		select: { value: true },
	});
	const have = new Set(existing.map((e) => e.value));
	const fresh = unique.filter((d) => !have.has(d));

	if (fresh.length > 0) {
		const start = await nextPosition(c.id);
		await prisma.caseDomain.createMany({
			data: fresh.map((value, i) => ({
				caseId: c.id,
				position: start + i,
				value,
			})),
		});
	}

	revalidatePath(`/cases/${c.number}`);

	const skipped = tokens.length - fresh.length;
	if (fresh.length === 0)
		return { ok: "Toate domeniile existau deja în listă" };
	return {
		ok: `Au fost adăugate ${fresh.length} ${fresh.length === 1 ? "domeniu" : "domenii"}${skipped > 0 ? ` (${skipped} existau deja sau erau repetate)` : ""}`,
	};
}

export async function deleteDomain(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const editable = await findEditableCase(formData);
	if (!editable) return locked;
	const { c } = editable;

	const row = await prisma.caseDomain.findFirst({
		where: { id: String(formData.get("id")), caseId: c.id },
	});
	if (!row) return { error: "Domeniul nu a fost găsit" };

	await prisma.$transaction([
		prisma.caseDomain.delete({ where: { id: row.id } }),
		prisma.caseDomain.updateMany({
			where: { caseId: c.id, position: { gt: row.position } },
			data: { position: { decrement: 1 } },
		}),
	]);

	revalidatePath(`/cases/${c.number}`);
	return { ok: "Domeniul a fost șters" };
}

export async function replaceFromFile(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const editable = await findEditableCase(formData);
	if (!editable) return locked;
	const { user, c } = editable;

	const file = formData.get("file") as File;
	const parsed = await parseDomains(file);
	if ("error" in parsed)
		return { error: parsed.error, details: parsed.details };
	const { domains, removedDuplicates, column } = parsed;

	const stored = await storeListFile(file);
	if ("error" in stored) return { error: stored.error };

	let replacedKeys: string[] = [];
	try {
		await prisma.$transaction(
			async (tx) => {
				if (c.stage === "draft") {
					const old = await tx.caseFile.findMany({
						where: { caseId: c.id, kind: "list" },
						select: { key: true },
					});
					replacedKeys = old.map((f) => f.key);
					await tx.caseFile.deleteMany({
						where: { caseId: c.id, kind: "list" },
					});
				}
				await tx.caseDomain.deleteMany({ where: { caseId: c.id } });
				await tx.caseDomain.createMany({
					data: domains.map((value, i) => ({
						caseId: c.id,
						position: i + 1,
						value,
					})),
				});
				await tx.case.update({
					where: { id: c.id },
					data: { fileName: file.name },
				});
				await tx.caseFile.create({
					data: {
						...stored.data,
						caseId: c.id,
						userId: user.id,
						kind: "list",
					},
				});
			},
			{ timeout: 60000 },
		);
	} catch (e) {
		await deleteObjects([stored.data.key]);
		throw e;
	}
	await deleteObjects(replacedKeys);

	revalidatePath(`/cases/${c.number}`);
	redirect(
		`/cases/${c.number}?ok=replaced&${listLoadedParams(column, removedDuplicates)}`,
	);
}
