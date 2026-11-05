import { prisma } from "@/lib/prisma";

export type IspFailures = {
	id: string;
	name: string;
	rows: { id: string; value: string; reason: string | null }[];
};

export async function getCaseReport(
	caseId: string,
	isps: { id: string; name: string }[],
	domainCount: number,
) {
	const [failed, reporting] = await Promise.all([
		prisma.ispDomainResult.findMany({
			where: { caseId, blocked: false },
			orderBy: { domain: { position: "asc" } },
			select: {
				id: true,
				userId: true,
				domainId: true,
				reason: true,
				domain: { select: { value: true } },
			},
		}),
		prisma.ispDomainResult.groupBy({ by: ["userId"], where: { caseId } }),
	]);
	if (reporting.length < isps.length) return null;

	const failures: IspFailures[] = isps.map((isp) => ({
		id: isp.id,
		name: isp.name,
		rows: failed
			.filter((f) => f.userId === isp.id)
			.map((f) => ({ id: f.id, value: f.domain.value, reason: f.reason })),
	}));

	return {
		blockedByAll: domainCount - new Set(failed.map((f) => f.domainId)).size,
		failures,
	};
}
