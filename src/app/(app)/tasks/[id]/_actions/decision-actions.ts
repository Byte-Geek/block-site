"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { decisionFlow } from "@/lib/cases/decision-flow";
import { stageByTaskKey } from "@/lib/flowable/task-keys";
import { completeTask, getTaskForUser } from "@/lib/flowable/tasks";
import { notify, notifyIspTasks } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

type State = { error?: string };

export async function decide(_prev: State, formData: FormData): Promise<State> {
	const user = await requireUser();
	if (!can(user.role, "task", "decide"))
		return { error: "Nu ai dreptul să finalizezi această sarcină" };

	const taskId = String(formData.get("taskId"));
	const decision = String(formData.get("decision"));
	const text = String(formData.get("text") ?? "").trim();

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
		await completeTask(taskId, [{ name: `${stage}Aprobat`, value: decision }]);
	} catch {
		await prisma.$transaction([
			prisma.caseComment.delete({ where: { id: comment.id } }),
			prisma.case.update({ where: { id: c.id }, data: { stage: c.stage } }),
		]);
		return { error: "Decizia nu a putut fi trimisă" };
	}

	if (step.next === "isp") {
		await notifyIspTasks(c);
	} else {
		await notify(
			c.id,
			`Caz #${c.number} ${step.message}${text ? `: ${text}` : ""}`,
			step.notify === "creator"
				? { users: [c.createdById] }
				: { roles: step.notify.roles },
		);
	}

	redirect("/tasks?ok=decision");
}
