"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/flowable";
import { notify } from "@/lib/notify";
import { domainProblem, parseDomains } from "@/lib/domains";
import { requireGroup } from "@/lib/require-group";
import { findInitiatorTask } from "@/lib/task-access";

type State = { error?: string; details?: string[] };

function parseNumber(value: FormDataEntryValue | null) {
	const n = Number(value);
	return Number.isInteger(n) && n >= 1 && n <= 2147483647 ? n : null;
}

async function countInvalid(caseId: string) {
	const all = await prisma.caseDomain.findMany({
		where: { caseId },
		select: { value: true },
	});
	return all.filter((d) => domainProblem(d.value)).length;
}

export async function sendDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const number = parseNumber(formData.get("number"));
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
			error: `${invalid} domenii au probleme. Corectează-le sau șterge-le înainte să trimiți.`,
		};

	const ispMembers = await prisma.membership.findMany({
		where: { groupKey: "isp" },
	});
	if (ispMembers.length === 0)
		return { error: "Nu există utilizatori în grupul ISP" };

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
					value: ispMembers.map((m) => m.userId),
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
			error: "Procesul nu a putut fi pornit. Ciorna a rămas salvată, încearcă din nou.",
		};
	}

	await notify(c.id, `Caz nou #${c.number}: lista așteaptă validarea ASP`, {
		groups: ["asp"],
	});

	revalidatePath("/cases");
	redirect(`/cases/${c.number}?ok=sent`);
}

export async function cancelDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const number = parseNumber(formData.get("number"));
	if (!number) return { error: "Caz invalid" };

	const result = await prisma.case.deleteMany({
		where: { number, createdById: user.id, stage: "draft" },
	});
	if (result.count === 0)
		return { error: "Doar o ciornă proprie poate fi anulată" };

	revalidatePath("/cases");
	redirect("/cases?ok=cancelled");
}

export async function resubmitCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const number = parseNumber(formData.get("number"));
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
			error: `${invalid} domenii au probleme. Corectează-le sau șterge-le înainte să retrimiți.`,
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
		await flowable(
			`/runtime/tasks/${encodeURIComponent(task.id)}`,
			"POST",
			{
				action: "complete",
			},
		);
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
		{ groups: ["asp"] },
	);

	revalidatePath("/cases");
	redirect(`/cases/${c.number}?ok=resubmit`);
}

export async function replaceFromFile(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const number = parseNumber(formData.get("number"));
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

	await prisma.$transaction(
		async (tx) => {
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
		},
		{ timeout: 60000 },
	);

	revalidatePath(`/cases/${c.number}`);
	redirect(
		`/cases/${c.number}?ok=replaced&col=${column}${removedDuplicates > 0 ? `&dup=${removedDuplicates}` : ""}`,
	);
}

export async function cancelCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireGroup("initiator");

	const number = parseNumber(formData.get("number"));
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
