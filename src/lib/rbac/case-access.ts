import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac/permissions";
import type { Prisma } from "../../../generated/prisma/client";

export function caseAccess(user: { id: string; role?: string | null }) {
	let where: Prisma.CaseWhereInput | null = null;
	if (can(user.role, "case", "readAll")) where = { stage: { not: "draft" } };
	else if (can(user.role, "case", "readOwn")) where = { createdById: user.id };
	else if (can(user.role, "case", "readApproved"))
		where = { comments: { some: { stage: "anr", decision: "da" } } };

	return where ? { where } : null;
}

export async function requireCaseAccess() {
	const user = await requireUser();
	const access = caseAccess(user);
	if (!access) redirect("/");
	return { user, access };
}
