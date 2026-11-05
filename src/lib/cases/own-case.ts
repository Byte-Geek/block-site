import { parseCaseNumber } from "@/lib/cases/case-number";
import { EDITABLE_STAGES } from "@/lib/cases/constants";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/require-permission";

export async function findOwnCase(formData: FormData) {
	const user = await requirePermission("case", "create");
	const number = parseCaseNumber(formData.get("number"));
	const c = number
		? await prisma.case.findFirst({
				where: { number, createdById: user.id },
				include: { _count: { select: { domains: true } } },
			})
		: null;
	return { user, c };
}

export async function findEditableCase(formData: FormData) {
	const { user, c } = await findOwnCase(formData);
	return c && EDITABLE_STAGES.includes(c.stage) ? { user, c } : null;
}
