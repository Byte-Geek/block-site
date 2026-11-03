import type { Prisma } from "../../generated/prisma/client";

export function caseAccess(user: {
	id: string;
	role?: string | null;
	group: string | null;
}) {
	const group = user.group;
	const notDraft = { stage: { not: "draft" } };

	let where: Prisma.CaseWhereInput | null = null;
	if (user.role === "admin") where = notDraft;
	else if (group === "initiator") where = { createdById: user.id };
	else if (group === "asp" || group === "anr") where = notDraft;
	else if (group === "isp")
		where = { comments: { some: { stage: "anr", decision: "da" } } };

	return where ? { where, group } : null;
}
