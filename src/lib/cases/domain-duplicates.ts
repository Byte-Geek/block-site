import { prisma } from "@/lib/prisma";

type DomainDuplicate = {
	value: string;
	number: number;
	stage: string;
	createdById: string;
};

function findDuplicates(caseId: string) {
	return prisma.$queryRaw<DomainDuplicate[]>`
		SELECT d."value", c."number", c."stage", c."createdById"
		FROM "case_domains" d
		JOIN "case_domains" o ON o."value" = d."value" AND o."caseId" <> d."caseId"
		JOIN "cases" c ON c."id" = o."caseId"
		WHERE d."caseId" = ${caseId}
			AND c."stage" NOT IN ('draft', 'cancelled')
		ORDER BY d."position", c."number"`;
}

export async function duplicatesByDomain(caseId: string, userId: string) {
	const result: Record<
		string,
		{ number: number; stage: string; own: boolean }[]
	> = {};
	for (const d of await findDuplicates(caseId)) {
		const list = result[d.value] ?? [];
		list.push({
			number: d.number,
			stage: d.stage,
			own: d.createdById === userId,
		});
		result[d.value] = list;
	}
	return result;
}
