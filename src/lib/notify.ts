import { prisma } from "@/lib/prisma";

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
