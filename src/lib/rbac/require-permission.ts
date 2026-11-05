import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can, type Statement } from "@/lib/rbac/permissions";

export async function requirePermission<R extends keyof Statement>(
	resource: R,
	action: Statement[R][number],
) {
	const user = await requireUser();
	if (!can(user.role, resource, action)) redirect("/");
	return user;
}
