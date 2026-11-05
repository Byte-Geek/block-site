"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { finalIspStatuses, ispStatuses } from "@/lib/cases/constants";
import { decisionFlow } from "@/lib/cases/flow";
import { notify, notifyIspTasks } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/workflow/flowable";
import { stageByTaskKey } from "@/lib/workflow/stages";
import { type FlowTask, getTaskForUser } from "@/lib/workflow/tasks";

export async function decide(
	_prev: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const user = await requireUser();
	if (!can(user.role, "task", "decide"))
		return { error: "Nu ai dreptul să finalizezi această sarcină" };

	const taskId = String(formData.get("taskId"));
	const decision = String(formData.get("decision"));
	const text = String(formData.get("text")).trim();

	if (decision !== "da" && decision !== "nu")
		return { error: "Decizie invalidă" };
	if (decision === "nu" && !text)
		return { error: "La respingere comentariul este obligatoriu" };

	const found = await getTaskForUser(taskId, user);
	if (!found) return { error: "Sarcina nu a fost găsită" };
	if (!found.mine) return { error: "Preia sarcina înainte să o finalizezi" };
	const { c } = found;

	const stage = stageByTaskKey[found.task.taskDefinitionKey];
	const step = decisionFlow[stage]?.[decision];
	if (!step) return { error: "Această sarcină nu cere o decizie" };

	const [comment] = await prisma.$transaction([
		prisma.caseComment.create({
			data: {
				caseId: c.id,
				userId: user.id,
				stage,
				decision,
				text: text || null,
			},
		}),
		prisma.case.update({ where: { id: c.id }, data: { stage: step.next } }),
	]);

	try {
		await flowable(`/runtime/tasks/${taskId}`, "POST", {
			action: "complete",
			variables: [{ name: `${stage}Aprobat`, value: decision }],
		});
	} catch {
		await prisma.$transaction([
			prisma.caseComment.delete({ where: { id: comment.id } }),
			prisma.case.update({
				where: { id: c.id },
				data: { stage: c.stage },
			}),
		]);
		return { error: "Decizia nu a putut fi trimisă" };
	}

	if (step.next === "isp") {
		await notifyIspTasks(c);
		redirect("/tasks?ok=decision");
	}

	await notify(
		c.id,
		`Caz #${c.number} ${step.message}${text ? `: ${text}` : ""}`,
		step.notify === "creator"
			? { users: [c.createdById] }
			: { roles: step.notify.roles },
	);

	redirect("/tasks?ok=decision");
}

async function saveIspStatus(
	userId: string,
	taskId: string,
	found: {
		task: FlowTask;
		c: { id: string; number: number; createdById: string };
	},
	status: string,
	reason: string,
): Promise<{ error?: string; ok?: string }> {
	const { task, c } = found;

	const response = await prisma.ispResponse.create({
		data: {
			caseId: c.id,
			userId,
			status,
			reason: reason || null,
		},
	});

	if (!finalIspStatuses.includes(status)) {
		revalidatePath(`/tasks/${taskId}`);
		return { ok: "Starea a fost salvată" };
	}

	try {
		await flowable(`/runtime/tasks/${taskId}`, "POST", {
			action: "complete",
		});
	} catch {
		await prisma.ispResponse.delete({ where: { id: response.id } });
		return { error: "Răspunsul nu a putut fi trimis" };
	}

	const left = (await flowable(
		`/runtime/tasks?processInstanceId=${task.processInstanceId}&size=100`,
	)) as { data: unknown[] };
	if (left.data.length === 0) {
		await prisma.case.update({
			where: { id: c.id },
			data: { stage: "closed" },
		});
		await notify(
			c.id,
			`Caz #${c.number} s-a închis: au răspuns toți ISP-urile`,
			{ roles: ["asp", "anr"], users: [c.createdById] },
		);
	}
	redirect("/tasks?ok=isp");
}

export async function setIspStatus(
	_prev: { error?: string; ok?: string },
	formData: FormData,
): Promise<{ error?: string; ok?: string }> {
	const user = await requireUser();
	if (!can(user.role, "task", "execute"))
		return { error: "Nu ai dreptul să finalizezi această sarcină" };

	const taskId = String(formData.get("taskId"));
	const status = String(formData.get("status"));
	const reason = String(formData.get("reason")).trim();

	if (!ispStatuses.includes(status)) return { error: "Stare invalidă" };
	if (finalIspStatuses.includes(status))
		return {
			error:
				"Starea finală se stabilește cu butonul Finalizează, după ce toate domeniile au bifă sau motiv",
		};

	const found = await getTaskForUser(taskId, user);
	if (!found) return { error: "Sarcina nu a fost găsită" };
	if (!found.mine) return { error: "Preia sarcina înainte să o finalizezi" };

	return saveIspStatus(user.id, taskId, found, status, reason);
}

async function myIspTask(taskId: string) {
	const user = await requireUser();
	if (!can(user.role, "task", "execute")) return null;
	const found = await getTaskForUser(taskId, user);
	if (!found?.mine) return null;
	return { user, ...found };
}

const notMine = { error: "Preia sarcina înainte să marchezi domeniile" };

export async function setDomainBlocked(
	taskId: string,
	domainId: string,
	blocked: boolean,
): Promise<{ error?: string }> {
	const t = await myIspTask(taskId);
	if (!t) return notMine;

	const domain = await prisma.caseDomain.findFirst({
		where: { id: domainId, caseId: t.c.id },
	});
	if (!domain) return { error: "Domeniul nu a fost găsit" };

	if (blocked)
		await prisma.ispDomainResult.upsert({
			where: { userId_domainId: { userId: t.user.id, domainId } },
			create: {
				caseId: t.c.id,
				userId: t.user.id,
				domainId,
				blocked: true,
			},
			update: { blocked: true, reason: null },
		});
	else
		await prisma.ispDomainResult.deleteMany({
			where: { userId: t.user.id, domainId },
		});

	revalidatePath(`/tasks/${taskId}`);
	return {};
}

export async function setDomainReason(
	taskId: string,
	domainId: string,
	reasonText: string,
): Promise<{ error?: string }> {
	const t = await myIspTask(taskId);
	if (!t) return notMine;

	const reason = reasonText.trim();
	if (!reason) return { error: "Scrie de ce domeniul nu poate fi blocat" };

	const domain = await prisma.caseDomain.findFirst({
		where: { id: domainId, caseId: t.c.id },
	});
	if (!domain) return { error: "Domeniul nu a fost găsit" };

	await prisma.ispDomainResult.upsert({
		where: { userId_domainId: { userId: t.user.id, domainId } },
		create: {
			caseId: t.c.id,
			userId: t.user.id,
			domainId,
			blocked: false,
			reason,
		},
		update: { blocked: false, reason },
	});

	revalidatePath(`/tasks/${taskId}`);
	return {};
}

export async function setAllBlocked(
	taskId: string,
	blocked: boolean,
): Promise<{ error?: string }> {
	const t = await myIspTask(taskId);
	if (!t) return notMine;

	await prisma.$transaction([
		prisma.ispDomainResult.deleteMany({
			where: { caseId: t.c.id, userId: t.user.id },
		}),
		...(blocked
			? [
					prisma.$executeRaw`
						INSERT INTO "isp_domain_results" ("id", "caseId", "userId", "domainId", "blocked")
						SELECT gen_random_uuid()::text, d."caseId", ${t.user.id}::text, d."id", true
						FROM "case_domains" d
						WHERE d."caseId" = ${t.c.id}`,
				]
			: []),
	]);

	revalidatePath(`/tasks/${taskId}`);
	return {};
}

export async function finishIspTask(
	_prev: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const taskId = String(formData.get("taskId"));
	const t = await myIspTask(taskId);
	if (!t) return notMine;

	const where = { caseId: t.c.id, userId: t.user.id };
	const [total, marked, blockedCount] = await Promise.all([
		prisma.caseDomain.count({ where: { caseId: t.c.id } }),
		prisma.ispDomainResult.count({ where }),
		prisma.ispDomainResult.count({ where: { ...where, blocked: true } }),
	]);
	if (marked < total)
		return {
			error: `Mai sunt ${total - marked} domenii fără bifă sau motiv`,
		};

	const status =
		blockedCount === total
			? "completed"
			: blockedCount === 0
				? "impossible"
				: "partial_failure";

	const result = await saveIspStatus(t.user.id, taskId, t, status, "");
	return { error: result.error };
}

type ActionState = { error?: string; ok?: string };

export async function claimTask(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const user = await requireUser();
	if (!can(user.role, "task", "claim"))
		return { error: "Nu ai dreptul să preiei această sarcină" };

	const taskId = String(formData.get("taskId"));
	const found = await getTaskForUser(taskId, user);
	if (!found)
		return {
			error: "Sarcina nu a fost găsită sau a fost preluată de altcineva",
		};
	if (found.mine) return { error: "Sarcina este deja a ta" };

	try {
		await flowable(`/runtime/tasks/${encodeURIComponent(taskId)}`, "POST", {
			action: "claim",
			assignee: user.id,
		});
	} catch {
		return {
			error: "Sarcina nu a putut fi preluată, poate a preluat-o altcineva",
		};
	}

	await prisma.caseComment
		.create({
			data: {
				caseId: found.c.id,
				userId: user.id,
				stage: stageByTaskKey[found.task.taskDefinitionKey],
				decision: "preluat",
			},
		})
		.catch((e) => console.error("CLAIM EVENT:", e));

	revalidatePath("/tasks");
	revalidatePath(`/tasks/${taskId}`);
	revalidatePath(`/cases/${found.c.number}`);
	return { ok: "Ai preluat sarcina" };
}

export async function releaseTask(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const user = await requireUser();
	const taskId = String(formData.get("taskId"));

	let task: FlowTask;
	try {
		task = (await flowable(
			`/runtime/tasks/${encodeURIComponent(taskId)}`,
		)) as FlowTask;
	} catch {
		return { error: "Sarcina nu a fost găsită" };
	}

	if (!task.assignee) return { error: "Sarcina nu este preluată" };
	if (task.assignee !== user.id && !can(user.role, "task", "release"))
		return { error: "Doar cel care a preluat sarcina o poate elibera" };

	const stage = stageByTaskKey[task.taskDefinitionKey];
	if (!stage) return { error: "Această sarcină nu poate fi eliberată" };

	const c = await prisma.case.findUnique({
		where: { processInstanceId: task.processInstanceId },
	});
	if (!c) return { error: "Cazul nu a fost găsit" };

	try {
		await flowable(`/runtime/tasks/${encodeURIComponent(taskId)}`, "POST", {
			action: "claim",
			assignee: null,
		});
	} catch {
		return { error: "Sarcina nu a putut fi eliberată" };
	}

	await prisma.caseComment
		.create({
			data: {
				caseId: c.id,
				userId: task.assignee,
				stage,
				decision: "eliberat",
				text: task.assignee !== user.id ? "Eliberată de administrator" : null,
			},
		})
		.catch((e) => console.error("RELEASE EVENT:", e));

	revalidatePath("/tasks");
	revalidatePath(`/tasks/${taskId}`);
	revalidatePath(`/cases/${c.number}`);
	return { ok: "Sarcina a fost eliberată" };
}
