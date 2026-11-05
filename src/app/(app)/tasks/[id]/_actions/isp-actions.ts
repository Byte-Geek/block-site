"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { finalIspStatuses, ispStatuses } from "@/lib/cases/constants";
import {
	completeTask,
	type FlowTask,
	getTaskForUser,
	listProcessTasks,
} from "@/lib/flowable/tasks";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

type State = { error?: string; ok?: string };

type FoundTask = {
	task: FlowTask;
	c: { id: string; number: number; createdById: string };
};

const notMine = { error: "Preia sarcina înainte să marchezi domeniile" };

async function saveIspStatus(
	userId: string,
	taskId: string,
	{ task, c }: FoundTask,
	status: string,
	reason: string,
): Promise<State> {
	const response = await prisma.ispResponse.create({
		data: { caseId: c.id, userId, status, reason: reason || null },
	});

	if (!finalIspStatuses.includes(status)) {
		revalidatePath(`/tasks/${taskId}`);
		return { ok: "Starea a fost salvată" };
	}

	try {
		await completeTask(taskId);
	} catch {
		await prisma.ispResponse.delete({ where: { id: response.id } });
		return { error: "Răspunsul nu a putut fi trimis" };
	}

	const remaining = await listProcessTasks(task.processInstanceId);
	if (remaining.length === 0) {
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

async function findMyIspTask(taskId: string) {
	const user = await requireUser();
	if (!can(user.role, "task", "execute")) return null;
	const found = await getTaskForUser(taskId, user);
	return found?.mine ? { user, ...found } : null;
}

export async function setIspStatus(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const user = await requireUser();
	if (!can(user.role, "task", "execute"))
		return { error: "Nu ai dreptul să finalizezi această sarcină" };

	const taskId = String(formData.get("taskId"));
	const status = String(formData.get("status"));
	const reason = String(formData.get("reason") ?? "").trim();

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

export async function setDomainBlocked(
	taskId: string,
	domainId: string,
	blocked: boolean,
): Promise<State> {
	const mine = await findMyIspTask(taskId);
	if (!mine) return notMine;

	const domain = await prisma.caseDomain.findFirst({
		where: { id: domainId, caseId: mine.c.id },
	});
	if (!domain) return { error: "Domeniul nu a fost găsit" };

	if (blocked)
		await prisma.ispDomainResult.upsert({
			where: { userId_domainId: { userId: mine.user.id, domainId } },
			create: {
				caseId: mine.c.id,
				userId: mine.user.id,
				domainId,
				blocked: true,
			},
			update: { blocked: true, reason: null },
		});
	else
		await prisma.ispDomainResult.deleteMany({
			where: { userId: mine.user.id, domainId },
		});

	revalidatePath(`/tasks/${taskId}`);
	return {};
}

export async function setDomainReason(
	taskId: string,
	domainId: string,
	reasonText: string,
): Promise<State> {
	const mine = await findMyIspTask(taskId);
	if (!mine) return notMine;

	const reason = reasonText.trim();
	if (!reason) return { error: "Scrie de ce domeniul nu poate fi blocat" };

	const domain = await prisma.caseDomain.findFirst({
		where: { id: domainId, caseId: mine.c.id },
	});
	if (!domain) return { error: "Domeniul nu a fost găsit" };

	await prisma.ispDomainResult.upsert({
		where: { userId_domainId: { userId: mine.user.id, domainId } },
		create: {
			caseId: mine.c.id,
			userId: mine.user.id,
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
): Promise<State> {
	const mine = await findMyIspTask(taskId);
	if (!mine) return notMine;

	await prisma.$transaction([
		prisma.ispDomainResult.deleteMany({
			where: { caseId: mine.c.id, userId: mine.user.id },
		}),
		...(blocked
			? [
					prisma.$executeRaw`
						INSERT INTO "isp_domain_results" ("id", "caseId", "userId", "domainId", "blocked")
						SELECT gen_random_uuid()::text, d."caseId", ${mine.user.id}::text, d."id", true
						FROM "case_domains" d
						WHERE d."caseId" = ${mine.c.id}`,
				]
			: []),
	]);

	revalidatePath(`/tasks/${taskId}`);
	return {};
}

export async function finishIspTask(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const taskId = String(formData.get("taskId"));
	const mine = await findMyIspTask(taskId);
	if (!mine) return notMine;

	const where = { caseId: mine.c.id, userId: mine.user.id };
	const [total, marked, blockedCount] = await Promise.all([
		prisma.caseDomain.count({ where: { caseId: mine.c.id } }),
		prisma.ispDomainResult.count({ where }),
		prisma.ispDomainResult.count({ where: { ...where, blocked: true } }),
	]);
	if (marked < total)
		return { error: `Mai sunt ${total - marked} domenii fără bifă sau motiv` };

	const status =
		blockedCount === total
			? "completed"
			: blockedCount === 0
				? "impossible"
				: "partial_failure";

	const result = await saveIspStatus(mine.user.id, taskId, mine, status, "");
	return { error: result.error };
}
