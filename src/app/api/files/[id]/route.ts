import { caseAccess } from "@/lib/case-access";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";

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

	const body = await getFile(f.key).catch(() => null);
	if (!body)
		return new Response("Fișierul nu poate fi citit din S3", {
			status: 502,
		});

	return new Response(body, {
		headers: {
			"Content-Type": f.contentType,
			"Content-Length": String(f.size),
			"Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
