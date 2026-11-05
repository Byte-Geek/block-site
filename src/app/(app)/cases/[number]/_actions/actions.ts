"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rolesWith } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { domainProblem, parseDomains } from "@/lib/cases/domains";
import { findDuplicates } from "@/lib/cases/duplicates";
import { parseCaseNumber } from "@/lib/cases/number";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { deleteFiles, storeFile } from "@/lib/storage";
import { flowable } from "@/lib/workflow/flowable";
import { findInitiatorTask } from "@/lib/workflow/tasks";

type State = { error?: string; details?: string[] };

async function countInvalid(caseId: string) {
	const all = await prisma.caseDomain.findMany({
		where: { caseId },
		select: { value: true },
	});
	const bad = new Set(
		all.filter((d) => domainProblem(d.value)).map((d) => d.value),
	);
	for (const d of await findDuplicates(caseId)) bad.add(d.value);
	return bad.size;
}

export async function sendDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requirePermission("case", "create");

	const number = parseCaseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const c = await prisma.case.findFirst({
		where: { number, createdById: user.id },
		include: { _count: { select: { domains: true } } },
	});
	if (!c) return { error: "Cazul nu a fost găsit" };
	if (c.stage !== "draft") return { error: "Cazul a fost deja trimis" };
	if (c._count.domains === 0)
		return { error: "Lista este goală. Adaugă cel puțin un domeniu." };

	const invalid = await countInvalid(c.id);
	if (invalid > 0)
		return {
			error: `${invalid} domenii au probleme (invalide sau existente deja în alte cazuri). Corectează-le sau șterge-le înainte să trimiți.`,
		};

	const ispMembers = await prisma.user.findMany({
		where: { role: { in: rolesWith("task", "execute") } },
		select: { id: true },
	});
	if (ispMembers.length === 0)
		return { error: "Nu există utilizatori cu rolul ISP" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "draft" },
		data: { stage: "asp" },
	});
	if (claimed.count === 0) return { error: "Cazul a fost deja trimis" };

	let processInstanceId: string | undefined;
	try {
		const instance = (await flowable("/runtime/process-instances", "POST", {
			processDefinitionKey: "blocareSiteuri",
			variables: [
				{
					name: "ispUsers",
					type: "json",
					value: ispMembers.map((m) => m.id),
				},
			],
		})) as { id: string };
		processInstanceId = instance.id;

		const tasks = (await flowable(
			`/runtime/tasks?processInstanceId=${instance.id}`,
		)) as { data: { id: string }[] };
		await flowable(`/runtime/tasks/${tasks.data[0].id}`, "POST", {
			action: "complete",
		});

		await prisma.case.update({
			where: { id: c.id },
			data: { processInstanceId },
		});
		await prisma.caseComment.create({
			data: {
				caseId: c.id,
				userId: user.id,
				stage: "initiator",
				decision: "trimis",
				text: `${c.fileName}, ${c._count.domains} domenii`,
			},
		});
	} catch (e) {
		console.error("START PROCES:", e);
		if (processInstanceId) {
			await flowable(
				`/runtime/process-instances/${processInstanceId}`,
				"DELETE",
			).catch(() => {});
		}
		await prisma.case
			.update({
				where: { id: c.id },
				data: { stage: "draft", processInstanceId: null },
			})
			.catch(() => {});
		return {
			error:
				"Procesul nu a putut fi pornit. Ciorna a rămas salvată, încearcă din nou.",
		};
	}

	await notify(c.id, `Caz nou #${c.number}: lista așteaptă validarea ASP`, {
		roles: ["asp"],
	});

	revalidatePath("/cases");
	redirect(`/cases/${c.number}?ok=sent`);
}

export async function cancelDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requirePermission("case", "create");

	const number = parseCaseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const files = await prisma.caseFile.findMany({
		where: { case: { number, createdById: user.id, stage: "draft" } },
		select: { key: true },
	});
	const result = await prisma.case.deleteMany({
		where: { number, createdById: user.id, stage: "draft" },
	});
	if (result.count === 0)
		return { error: "Doar o ciornă proprie poate fi anulată" };
	await deleteFiles(files.map((f) => f.key));

	revalidatePath("/cases");
	redirect("/cases?ok=cancelled");
}

export async function resubmitCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requirePermission("case", "create");

	const number = parseCaseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const c = await prisma.case.findFirst({
		where: { number, createdById: user.id },
		include: { _count: { select: { domains: true } } },
	});
	if (!c) return { error: "Cazul nu a fost găsit" };
	if (c.stage !== "initiator" || !c.processInstanceId)
		return { error: "Cazul nu așteaptă corectarea listei" };
	if (c._count.domains === 0)
		return { error: "Lista este goală. Adaugă cel puțin un domeniu." };

	const invalid = await countInvalid(c.id);
	if (invalid > 0)
		return {
			error: `${invalid} domenii au probleme (invalide sau existente deja în alte cazuri). Corectează-le sau șterge-le înainte să retrimiți.`,
		};

	const task = await findInitiatorTask(c.processInstanceId).catch(() => null);
	if (!task)
		return { error: "Cazul nu poate fi retrimis acum, încearcă din nou" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "initiator" },
		data: { stage: "asp" },
	});
	if (claimed.count === 0) return { error: "Cazul a fost deja retrimis" };

	try {
		await flowable(`/runtime/tasks/${encodeURIComponent(task.id)}`, "POST", {
			action: "complete",
		});
	} catch (e) {
		console.error("RETRIMITERE:", e);
		await prisma.case
			.update({ where: { id: c.id }, data: { stage: "initiator" } })
			.catch(() => {});
		return { error: "Lista nu a putut fi retrimisă" };
	}

	await prisma.caseComment
		.create({
			data: {
				caseId: c.id,
				userId: user.id,
				stage: "initiator",
				decision: "retrimis",
				text: `${c._count.domains} domenii`,
			},
		})
		.catch((e) => console.error("EVENIMENT RETRIMITERE:", e));

	await notify(
		c.id,
		`Caz #${c.number}: lista a fost retrimisă, așteaptă validarea ASP`,
		{ roles: ["asp"] },
	);

	revalidatePath("/cases");
	redirect(`/cases/${c.number}?ok=resubmit`);
}

export async function replaceFromFile(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requirePermission("case", "create");

	const number = parseCaseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const c = await prisma.case.findFirst({
		where: { number, createdById: user.id },
	});
	if (!c || !["draft", "initiator"].includes(c.stage))
		return { error: "Lista nu mai poate fi modificată" };

	const file = formData.get("file") as File;
	const parsed = await parseDomains(file);
	if ("error" in parsed)
		return { error: parsed.error, details: parsed.details };
	const { domains, removedDuplicates, column } = parsed;

	const stored = await storeFile(file);
	if ("error" in stored) return { error: stored.error };

	let oldKeys: string[] = [];
	try {
		await prisma.$transaction(
			async (tx) => {
				if (c.stage === "draft") {
					const old = await tx.caseFile.findMany({
						where: { caseId: c.id, kind: "list" },
						select: { key: true },
					});
					oldKeys = old.map((f) => f.key);
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
		await deleteFiles([stored.data.key]);
		throw e;
	}
	await deleteFiles(oldKeys);

	revalidatePath(`/cases/${c.number}`);
	redirect(
		`/cases/${c.number}?ok=replaced&col=${column}${removedDuplicates > 0 ? `&dup=${removedDuplicates}` : ""}`,
	);
}

export async function cancelCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requirePermission("case", "create");

	const number = parseCaseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const c = await prisma.case.findFirst({
		where: { number, createdById: user.id },
	});
	if (!c || c.stage !== "initiator")
		return { error: "Doar un caz respins poate fi anulat" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "initiator" },
		data: { stage: "cancelled" },
	});
	if (claimed.count === 0) return { error: "Cazul nu mai poate fi anulat" };

	if (c.processInstanceId) {
		try {
			await flowable(
				`/runtime/process-instances/${encodeURIComponent(c.processInstanceId)}?deleteReason=${encodeURIComponent("Anulat de inițiator")}`,
				"DELETE",
			);
		} catch (e) {
			console.error("ANULARE CAZ:", e);
			await prisma.case
				.update({ where: { id: c.id }, data: { stage: "initiator" } })
				.catch(() => {});
			return { error: "Cazul nu a putut fi anulat" };
		}
	}

	await prisma.caseComment
		.create({
			data: {
				caseId: c.id,
				userId: user.id,
				stage: "initiator",
				decision: "anulat",
			},
		})
		.catch((e) => console.error("EVENIMENT ANULARE:", e));

	revalidatePath("/cases");
	redirect(`/cases/${c.number}?ok=cancelledCase`);
}
