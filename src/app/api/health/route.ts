import { flowable } from "@/lib/flowable";
import { prisma } from "@/lib/prisma";

export async function GET() {
	await prisma.$queryRaw`SELECT 1`;
	await flowable("/repository/deployments");
	return Response.json({ db: "ok", flowable: "ok" });
}
