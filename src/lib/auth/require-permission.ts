import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { can, type statement } from "@/lib/auth/permissions";

export async function requirePermission<R extends keyof typeof statement>(
	resource: R,
	action: (typeof statement)[R][number],
) {
	const user = await requireUser();
	if (!can(user.role, resource, action)) redirect("/");
	return user;
}
