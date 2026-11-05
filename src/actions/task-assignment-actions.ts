"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { stageByTaskKey } from "@/lib/flowable/task-keys";
import { assignTask, getTask, getTaskForUser } from "@/lib/flowable/tasks";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

type State = { error?: string; ok?: string };

function revalidateTask(taskId: string, caseNumber: number) {
	revalidatePath("/tasks");
	revalidatePath(`/tasks/${taskId}`);
	revalidatePath(`/cases/${caseNumber}`);
}

export async function claimTask(
	_prev: State,
	formData: FormData,
): Promise<State> {
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
		await assignTask(taskId, user.id);
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

	revalidateTask(taskId, found.c.number);
	return { ok: "Ai preluat sarcina" };
}

export async function releaseTask(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireUser();
	const taskId = String(formData.get("taskId"));

	const task = await getTask(taskId).catch(() => null);
	if (!task) return { error: "Sarcina nu a fost găsită" };
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
		await assignTask(taskId, null);
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

	revalidateTask(taskId, c.number);
	return { ok: "Sarcina a fost eliberată" };
}
