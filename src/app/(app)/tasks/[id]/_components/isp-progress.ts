import { prisma } from "@/lib/prisma";

export async function getIspProgress(
	caseId: string,
	userId: string,
	pageDomainIds: string[],
) {
	const mine = { caseId, userId };
	const [results, total, blocked, withReason] = await Promise.all([
		prisma.ispDomainResult.findMany({
			where: { ...mine, domainId: { in: pageDomainIds } },
		}),
		prisma.caseDomain.count({ where: { caseId } }),
		prisma.ispDomainResult.count({ where: { ...mine, blocked: true } }),
		prisma.ispDomainResult.count({ where: { ...mine, blocked: false } }),
	]);
	return {
		byDomain: new Map(results.map((r) => [r.domainId, r])),
		total,
		blocked,
		withReason,
	};
}
