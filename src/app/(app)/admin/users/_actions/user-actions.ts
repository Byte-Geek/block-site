"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import {
	addToGroup,
	createFlowableUser,
	deleteFlowableUser,
	removeFromGroup,
	updateFlowableUser,
} from "@/lib/flowable/identity";
import { hasOpenTasks } from "@/lib/flowable/tasks";
import { prisma } from "@/lib/prisma";
import { isAdmin, processRoles, type Role } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/require-permission";

type State = {
	error?: string;
	ok?: string;
	name?: string;
	email?: string;
	role?: string;
};

const MIN_PASSWORD_LENGTH = 8;

const isProcessRole = (value: string): value is (typeof processRoles)[number] =>
	(processRoles as readonly string[]).includes(value);

export async function createUser(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requirePermission("user", "create");
	const name = String(formData.get("name")).trim();
	const email = String(formData.get("email")).trim().toLowerCase();
	const password = String(formData.get("password"));
	const role = String(formData.get("role"));
	const keep = { name, email, role };

	if (!name || !email || !role)
		return { error: "Completează toate câmpurile", ...keep };
	if (!isProcessRole(role)) return { error: "Rol invalid", ...keep };
	if (password.length < MIN_PASSWORD_LENGTH)
		return { error: "Parola: minim 8 caractere", ...keep };

	let userId: string;
	try {
		const { user } = await auth.api.createUser({
			body: { name, email, password, role },
			headers: await headers(),
		});
		userId = user.id;
	} catch {
		return {
			error: "Utilizatorul nu a putut fi creat (emailul poate exista deja)",
			...keep,
		};
	}

	try {
		await createFlowableUser({ id: userId, name, email });
		await addToGroup(userId, role);
	} catch (e) {
		console.error("CREATE USER:", e);
		await deleteFlowableUser(userId).catch(() => {});
		await auth.api
			.removeUser({ body: { userId }, headers: await headers() })
			.catch(() => {});
		return {
			error: "Utilizatorul nu a putut fi creat în Flowable",
			...keep,
		};
	}

	revalidatePath("/admin/users");
	return { ok: `Utilizatorul „${name}” a fost creat` };
}

export async function updateUser(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requirePermission("user", "set-role");
	const userId = String(formData.get("userId"));
	const email = String(formData.get("email"));
	const name = String(formData.get("name")).trim();
	const role = String(formData.get("role"));
	const password = String(formData.get("password"));

	if (!name || !role) return { error: "Numele și rolul sunt obligatorii" };
	if (!isProcessRole(role)) return { error: "Rol invalid" };
	if (password && password.length < MIN_PASSWORD_LENGTH)
		return { error: "Parola: minim 8 caractere" };

	const current = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	if (!current) return { error: "Utilizatorul nu a fost găsit" };
	if (isAdmin(current.role))
		return { error: "Contul de administrator nu se modifică de aici" };

	const roleChanged = current.role !== role;
	try {
		if (roleChanged && (await hasOpenTasks(userId)))
			return {
				error: "Utilizatorul are sarcini deschise, rolul nu poate fi schimbat",
			};

		const requestHeaders = await headers();
		await auth.api.adminUpdateUser({
			body: { userId, data: { name } },
			headers: requestHeaders,
		});
		if (password)
			await auth.api.setUserPassword({
				body: { userId, newPassword: password },
				headers: requestHeaders,
			});

		await updateFlowableUser(userId, { name, email });
		if (roleChanged) {
			await auth.api.setRole({
				body: { userId, role: role as Role },
				headers: requestHeaders,
			});
			if (current.role) await removeFromGroup(userId, current.role);
			await addToGroup(userId, role);
		}
	} catch (e) {
		console.error("UPDATE USER:", e);
		return { error: "Modificările nu au putut fi salvate" };
	}

	revalidatePath("/admin/users");
	return { ok: "Modificările au fost salvate" };
}

export async function deleteUser(
	_prev: State,
	formData: FormData,
): Promise<State> {
	const admin = await requirePermission("user", "delete");
	const userId = String(formData.get("userId"));
	if (userId === admin.id) return { error: "Nu îți poți șterge propriul cont" };

	const target = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true },
	});
	if (!target) return { error: "Utilizatorul nu a fost găsit" };

	try {
		const [cases, comments, responses] = await Promise.all([
			prisma.case.count({ where: { createdById: userId } }),
			prisma.caseComment.count({ where: { userId } }),
			prisma.ispResponse.count({ where: { userId } }),
		]);
		if (cases + comments + responses > 0)
			return {
				error:
					"Utilizatorul are istoric (cazuri, comentarii sau răspunsuri ISP) și nu poate fi șters",
			};
		if (await hasOpenTasks(userId))
			return {
				error: "Utilizatorul are sarcini deschise și nu poate fi șters",
			};

		await deleteFlowableUser(userId);
		await prisma.notification.deleteMany({ where: { userId } });
		await auth.api.removeUser({
			body: { userId },
			headers: await headers(),
		});
	} catch (e) {
		console.error("DELETE USER:", e);
		return { error: "Utilizatorul nu a putut fi șters" };
	}

	revalidatePath("/admin/users");
	return { ok: "Utilizatorul a fost șters" };
}
