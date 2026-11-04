import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";

export async function countByStage(where: Prisma.CaseWhereInput) {
	const rows = await prisma.case.groupBy({
		by: ["stage"],
		where,
		_count: { _all: true },
	});
	return {
		of: (stage: string) =>
			rows.find((r) => r.stage === stage)?._count._all ?? 0,
		total: rows.reduce((sum, r) => sum + r._count._all, 0),
	};
}
