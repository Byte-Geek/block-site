import { prisma } from "@/lib/prisma";

type Query = { q: string; page: string; size: number };

export async function getDomainsPage(caseId: string, { q, page, size }: Query) {
	const where = {
		caseId,
		...(q ? { value: { contains: q.toLowerCase() } } : {}),
	};
	const total = await prisma.caseDomain.count({ where });
	const pages = Math.max(1, Math.ceil(total / size));
	const current = Math.min(Math.max(1, Number(page) || 1), pages);

	const [domains, allTotal] = await Promise.all([
		prisma.caseDomain.findMany({
			where,
			orderBy: { position: "asc" },
			skip: (current - 1) * size,
			take: size,
		}),
		q ? prisma.caseDomain.count({ where: { caseId } }) : total,
	]);

	return { domains, total, allTotal, page: current, size };
}
