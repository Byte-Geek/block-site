import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/flowable";

export async function GET() {
	await prisma.$queryRaw`SELECT 1`;
	await flowable("/repository/deployments");
	return Response.json({ db: "ok", flowable: "ok" });
}
