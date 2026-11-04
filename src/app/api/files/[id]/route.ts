import { requireUser } from "@/lib/auth/current-user";
import { caseAccess } from "@/lib/cases/access";
import { prisma } from "@/lib/prisma";
import { presignDownload } from "@/lib/storage";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await requireUser();
	const access = caseAccess(user);
	if (!access) return new Response("Interzis", { status: 403 });

	const { id } = await params;
	const f = await prisma.caseFile.findFirst({
		where: { id, case: access.where },
	});
	if (!f) return new Response("Fișierul nu a fost găsit", { status: 404 });

	return Response.redirect(
		await presignDownload(f.key, f.name, f.contentType),
		302,
	);
}
