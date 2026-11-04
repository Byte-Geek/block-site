import { prisma } from "@/lib/prisma";
import { listCaseTasks } from "@/lib/workflow/tasks";

export async function notify(
	caseId: string,
	text: string,
	to: { groups?: string[]; users?: string[] },
) {
	try {
		const members = to.groups?.length
			? await prisma.membership.findMany({
					where: { groupKey: { in: to.groups } },
				})
			: [];
		const ids = [
			...new Set([...(to.users ?? []), ...members.map((m) => m.userId)]),
		];
		if (ids.length === 0) return;
		await prisma.notification.createMany({
			data: ids.map((userId) => ({ userId, caseId, text })),
		});
	} catch (e) {
		console.error("NOTIFY:", e);
	}
}

export async function notifyIspTasks(c: {
	id: string;
	number: number;
	processInstanceId: string | null;
}) {
	try {
		const tasks = await listCaseTasks(c.processInstanceId);
		const users = [
			...new Set(
				tasks
					.filter((t) => t.taskDefinitionKey === "ispTask")
					.map((t) => t.assignee ?? t.candidateUser)
					.filter((v): v is string => Boolean(v)),
			),
		];

		if (users.length === 0) {
			await notify(c.id, `Caz #${c.number}: așteaptă blocarea de către ISP`, {
				groups: ["isp"],
			});
			return;
		}

		await prisma.caseComment.createMany({
			data: users.map((userId) => ({
				caseId: c.id,
				userId,
				stage: "isp",
				decision: "notificat",
			})),
		});
		await notify(
			c.id,
			`Sarcină nouă: blocarea domeniilor din cazul #${c.number}`,
			{ users },
		);
	} catch (e) {
		console.error("NOTIFY ISP:", e);
	}
}
