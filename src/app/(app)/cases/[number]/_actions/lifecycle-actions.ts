"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEditableDomains } from "@/lib/cases/domain-queries";
import { findOwnCase } from "@/lib/cases/own-case";
import {
	deleteProcessInstance,
	startBlockingProcess,
} from "@/lib/flowable/process";
import { completeTask, findInitiatorTask } from "@/lib/flowable/tasks";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { rolesWith } from "@/lib/rbac/permissions";
import { deleteObjects } from "@/lib/storage/objects";

type State = { error?: string };

const caseNotFound = { error: "Cazul nu a fost găsit" };
const emptyList = { error: "Lista este goală. Adaugă cel puțin un domeniu." };

function invalidDomainsError(count: number, verb: string) {
	return {
		error: `${count} domenii au probleme (invalide sau existente deja în alte cazuri). Corectează-le sau șterge-le înainte să ${verb}.`,
	};
}

export async function sendDraft(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const { user, c } = await findOwnCase(formData);
	if (!c) return caseNotFound;
	if (c.stage !== "draft") return { error: "Cazul a fost deja trimis" };
	if (c._count.domains === 0) return emptyList;

	const { invalidCount } = await getEditableDomains(c.id, user.id);
	if (invalidCount > 0) return invalidDomainsError(invalidCount, "trimiți");

	const ispUsers = await prisma.user.findMany({
		where: { role: { in: rolesWith("task", "execute") } },
		select: { id: true },
	});
	if (ispUsers.length === 0)
		return { error: "Nu există utilizatori cu rolul ISP" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "draft" },
		data: { stage: "asp" },
	});
	if (claimed.count === 0) return { error: "Cazul a fost deja trimis" };

	let processInstanceId: string | undefined;
	try {
		processInstanceId = await startBlockingProcess(ispUsers.map((u) => u.id));
		await prisma.$transaction([
			prisma.case.update({ where: { id: c.id }, data: { processInstanceId } }),
			prisma.caseComment.create({
				data: {
					caseId: c.id,
					userId: user.id,
					stage: "initiator",
					decision: "trimis",
					text: `${c.fileName}, ${c._count.domains} domenii`,
				},
			}),
		]);
	} catch (e) {
		console.error("START PROCES:", e);
		if (processInstanceId)
			await deleteProcessInstance(processInstanceId).catch(() => {});
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
	const { user, c } = await findOwnCase(formData);
	if (!c || c.stage !== "draft")
		return { error: "Doar o ciornă proprie poate fi anulată" };

	const files = await prisma.caseFile.findMany({
		where: { caseId: c.id },
		select: { key: true },
	});
	const deleted = await prisma.case.deleteMany({
		where: { id: c.id, createdById: user.id, stage: "draft" },
	});
	if (deleted.count === 0)
		return { error: "Doar o ciornă proprie poate fi anulată" };
	await deleteObjects(files.map((f) => f.key));

	revalidatePath("/cases");
	redirect("/cases?ok=cancelled");
}

export async function resubmitCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const { user, c } = await findOwnCase(formData);
	if (!c) return caseNotFound;
	if (c.stage !== "initiator" || !c.processInstanceId)
		return { error: "Cazul nu așteaptă corectarea listei" };
	if (c._count.domains === 0) return emptyList;

	const { invalidCount } = await getEditableDomains(c.id, user.id);
	if (invalidCount > 0) return invalidDomainsError(invalidCount, "retrimiți");

	const task = await findInitiatorTask(c.processInstanceId).catch(() => null);
	if (!task)
		return { error: "Cazul nu poate fi retrimis acum, încearcă din nou" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "initiator" },
		data: { stage: "asp" },
	});
	if (claimed.count === 0) return { error: "Cazul a fost deja retrimis" };

	try {
		await completeTask(task.id);
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

export async function cancelCase(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const { user, c } = await findOwnCase(formData);
	if (!c || c.stage !== "initiator")
		return { error: "Doar un caz respins poate fi anulat" };

	const claimed = await prisma.case.updateMany({
		where: { id: c.id, stage: "initiator" },
		data: { stage: "cancelled" },
	});
	if (claimed.count === 0) return { error: "Cazul nu mai poate fi anulat" };

	if (c.processInstanceId) {
		try {
			await deleteProcessInstance(c.processInstanceId, "Anulat de inițiator");
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
