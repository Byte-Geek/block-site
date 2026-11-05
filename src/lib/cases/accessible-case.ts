import { requireUser } from "@/lib/auth/session";
import { parseCaseNumber } from "@/lib/cases/case-number";
import { prisma } from "@/lib/prisma";
import { caseAccess } from "@/lib/rbac/case-access";

export async function findAccessibleCase(value: unknown) {
	const user = await requireUser();
	const access = caseAccess(user);
	const number = parseCaseNumber(value);
	if (!access || !number) return null;

	const c = await prisma.case.findFirst({
		where: { AND: [access.where, { number }] },
	});
	if (!c || c.stage === "cancelled") return null;
	return { user, c };
}
