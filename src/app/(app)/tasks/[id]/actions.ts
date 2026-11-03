"use server";

import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import {
	finalIspStatuses,
	ispStatuses,
	needsReasonStatuses,
} from "@/lib/constants";
import { requireUser } from "@/lib/current-user";
import { flowable } from "@/lib/flowable";
import { notify, notifyIspTasks } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { type FlowTask, getTaskForUser } from "@/lib/task-access";

export async function decide(
	_prev: { error?: string },
	formData: FormData,
): Promise<{ error?: string }> {
	const user = await requireUser();
	if (!user.group || !["asp", "anr"].includes(user.group))
		return { error: "Nu ai dreptul să finalizezi această sarcină" };
	const stage = user.group;

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

	const nextStage =
		stage === "asp"
			? decision === "da"
				? "anr"
				: "initiator"
			: decision === "da"
				? "isp"
				: "asp";

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
		prisma.case.update({ where: { id: c.id }, data: { stage: nextStage } }),
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

	if (stage === "anr" && decision === "da") {
		await notifyIspTasks(c);
		redirect("/tasks?ok=decision");
	}

	const message =
		stage === "asp"
			? decision === "da"
				? "așteaptă validarea ANRCETI"
				: "a fost respins de ASP"
			: decision === "da"
				? "așteaptă blocarea de către ISP"
				: "a fost respins de ANRCETI";
	const to =
		stage === "asp"
			? decision === "da"
				? { groups: ["anr"] }
				: { users: [c.createdById] }
			: decision === "da"
				? { groups: ["isp"] }
				: { groups: ["asp"] };
	await notify(
		c.id,
		`Caz #${c.number} ${message}${text ? `: ${text}` : ""}`,
		to,
	);

	redirect("/tasks?ok=decision");
}

export async function setIspStatus(
	_prev: { error?: string; ok?: string },
	formData: FormData,
): Promise<{ error?: string; ok?: string }> {
	const user = await requireUser();
	if (user.group !== "isp")
		return { error: "Nu ai dreptul să finalizezi această sarcină" };

	const taskId = String(formData.get("taskId"));
	const status = String(formData.get("status"));
	const reason = String(formData.get("reason")).trim();

	if (!ispStatuses.includes(status)) return { error: "Stare invalidă" };
	if (needsReasonStatuses.includes(status) && !reason)
		return {
			error: "Motivul tehnic este obligatoriu pentru această stare",
		};

	const found = await getTaskForUser(taskId, user);
	if (!found) return { error: "Sarcina nu a fost găsită" };
	if (!found.mine) return { error: "Preia sarcina înainte să o finalizezi" };
	const { task, c } = found;

	const response = await prisma.ispResponse.create({
		data: {
			caseId: c.id,
			userId: user.id,
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
			{ groups: ["asp", "anr"], users: [c.createdById] },
		);
	}
	redirect("/tasks?ok=isp");
}

type ActionState = { error?: string; ok?: string };

const stageByTaskKey: Record<string, string> = {
	aspTask: "asp",
	anrTask: "anr",
	ispTask: "isp",
};

export async function claimTask(
	_prev: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const user = await requireUser();
	if (!user.group || !["asp", "anr", "isp"].includes(user.group))
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
				stage: user.group,
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
	const isAdmin = user.role === "admin";
	if (task.assignee !== user.id && !isAdmin)
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
				text:
					task.assignee !== user.id
						? "Eliberată de administrator"
						: null,
			},
		})
		.catch((e) => console.error("RELEASE EVENT:", e));

	revalidatePath("/tasks");
	revalidatePath(`/tasks/${taskId}`);
	revalidatePath(`/cases/${c.number}`);
	return { ok: "Sarcina a fost eliberată" };
}
