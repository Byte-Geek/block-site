import { prisma } from "@/lib/prisma";

export type DomainDuplicate = {
	value: string;
	number: number;
	stage: string;
	createdById: string;
};


export async function findDuplicates(caseId: string) {
	return prisma.$queryRaw<DomainDuplicate[]>`
		SELECT d."value", c."number", c."stage", c."createdById"
		FROM "case_domains" d
		JOIN "case_domains" o ON o."value" = d."value" AND o."caseId" <> d."caseId"
		JOIN "cases" c ON c."id" = o."caseId"
		WHERE d."caseId" = ${caseId}
			AND c."stage" NOT IN ('draft', 'cancelled')
		ORDER BY d."position", c."number"`;
}

export function groupDuplicates(rows: DomainDuplicate[]) {
	const map = new Map<string, DomainDuplicate[]>();
	for (const r of rows) {
		const list = map.get(r.value) ?? [];
		list.push(r);
		map.set(r.value, list);
	}
	return map;
}
