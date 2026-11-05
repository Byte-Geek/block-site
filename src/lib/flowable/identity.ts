import { flowableRequest, ignoreFlowableStatus } from "@/lib/flowable/client";
import { type Role, roleLabels } from "@/lib/rbac/permissions";

type FlowableUser = { id: string; name: string; email: string };

export async function createFlowableUser({ id, name, email }: FlowableUser) {
	await flowableRequest("/identity/users", "POST", {
		id,
		firstName: name,
		email,
		password: crypto.randomUUID(),
	});
}

export async function updateFlowableUser(
	id: string,
	{ name, email }: Omit<FlowableUser, "id">,
) {
	await flowableRequest(`/identity/users/${id}`, "PUT", {
		firstName: name,
		email,
	});
}

export async function deleteFlowableUser(id: string) {
	await flowableRequest(`/identity/users/${id}`, "DELETE");
}

async function ensureGroup(role: Role) {
	await flowableRequest("/identity/groups", "POST", {
		id: role,
		name: roleLabels[role],
		type: "assignment",
	}).catch(ignoreFlowableStatus(409));
}

export async function addToGroup(userId: string, role: Role) {
	await ensureGroup(role);
	await flowableRequest(`/identity/groups/${role}/members`, "POST", {
		userId,
	}).catch(ignoreFlowableStatus(409));
}

export async function removeFromGroup(userId: string, role: string) {
	await flowableRequest(
		`/identity/groups/${role}/members/${userId}`,
		"DELETE",
	).catch(ignoreFlowableStatus(404));
}
