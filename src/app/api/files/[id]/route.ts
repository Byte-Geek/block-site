import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { caseAccess } from "@/lib/rbac/case-access";
import { createDownloadUrl } from "@/lib/storage/presigned-urls";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const user = await requireUser();
	const access = caseAccess(user);
	if (!access) return new Response("Interzis", { status: 403 });

	const { id } = await params;
	const file = await prisma.caseFile.findFirst({
		where: { id, case: access.where },
	});
	if (!file) return new Response("Fișierul nu a fost găsit", { status: 404 });

	return Response.redirect(
		await createDownloadUrl(file.key, file.name, file.contentType),
		302,
	);
}
