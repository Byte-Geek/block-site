import { type Role, roleLabels } from "@/lib/auth/permissions";
import { flowable } from "@/lib/workflow/flowable";

export async function ensureGroup(role: Role) {
	await flowable("/identity/groups", "POST", {
		id: role,
		name: roleLabels[role],
		type: "assignment",
	}).catch(() => {});
}

export async function addToGroup(userId: string, role: Role) {
	await ensureGroup(role);
	await flowable(`/identity/groups/${role}/members`, "POST", { userId });
}

export async function removeFromGroup(userId: string, role: string) {
	await flowable(`/identity/groups/${role}/members/${userId}`, "DELETE").catch(
		() => {},
	);
}
