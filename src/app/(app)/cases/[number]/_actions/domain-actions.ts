"use server";

import { revalidatePath } from "next/cache";
import { requireGroup } from "@/lib/auth/require-group";
import { domainProblem, normalizeDomain } from "@/lib/cases/domains";
import { parseCaseNumber } from "@/lib/cases/number";
import { prisma } from "@/lib/prisma";

type State = { error?: string; ok?: string; details?: string[] };

async function editableCase(formData: FormData) {
	const user = await requireGroup("initiator");
	const number = parseCaseNumber(formData.get("number"));
	if (!number) return null;

	const c = await prisma.case.findFirst({
		where: { number, createdById: user.id },
	});
	return c && ["draft", "initiator"].includes(c.stage) ? c : null;
}

const locked = { error: "Lista nu mai poate fi modificată" };

export async function updateDomain(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const c = await editableCase(formData);
	if (!c) return locked;

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
	const c = await editableCase(formData);
	if (!c) return locked;

	const value = normalizeDomain(String(formData.get("value") ?? ""));
	const problem = domainProblem(value);
	if (problem) return { error: problem };

	const exists = await prisma.caseDomain.findFirst({
		where: { caseId: c.id, value },
	});
	if (exists) return { error: "Domeniul există deja în listă" };

	const last = await prisma.caseDomain.aggregate({
		where: { caseId: c.id },
		_max: { position: true },
	});
	await prisma.caseDomain.create({
		data: { caseId: c.id, position: (last._max.position ?? 0) + 1, value },
	});

	revalidatePath(`/cases/${c.number}`);
	return { ok: `Adăugat: ${value}` };
}

export async function addDomains(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const c = await editableCase(formData);
	if (!c) return locked;

	const tokens = String(formData.get("text") ?? "")
		.split(/[\s,;]+/)
		.map(normalizeDomain)
		.filter(Boolean);
	if (tokens.length === 0) return { error: "Lipește cel puțin un domeniu" };
	if (tokens.length > 20000)
		return { error: "Maximum 20.000 de domenii o dată" };

	const unique = [...new Set(tokens)];
	const problems = unique.flatMap((d) => {
		const p = domainProblem(d);
		return p ? [`${d}: ${p}`] : [];
	});
	if (problems.length > 0)
		return {
			error: `${problems.length} ${problems.length === 1 ? "domeniu nu este valid" : "domenii nu sunt valide"}. Nu s-a adăugat nimic.`,
			details: problems.slice(0, 100),
		};

	const existing = await prisma.caseDomain.findMany({
		where: { caseId: c.id, value: { in: unique } },
		select: { value: true },
	});
	const have = new Set(existing.map((e) => e.value));
	const fresh = unique.filter((d) => !have.has(d));

	if (fresh.length > 0) {
		const last = await prisma.caseDomain.aggregate({
			where: { caseId: c.id },
			_max: { position: true },
		});
		const start = (last._max.position ?? 0) + 1;
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
	const c = await editableCase(formData);
	if (!c) return locked;

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
