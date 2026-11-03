"use server";

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/flowable";
import { requireAdmin } from "@/lib/require-admin";
import { hasOpenTasks } from "@/lib/task-access";

type State = {
	error?: string;
	ok?: string;
	name?: string;
	email?: string;
	groupKey?: string;
};

export async function createUser(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requireAdmin();
	const name = String(formData.get("name")).trim();
	const email = String(formData.get("email")).trim().toLowerCase();
	const password = String(formData.get("password"));
	const groupKey = String(formData.get("groupKey"));
	const keep = { name, email, groupKey };

	if (!name || !email || !groupKey)
		return { error: "Completează toate câmpurile", ...keep };
	if (password.length < 8)
		return { error: "Parola: minim 8 caractere", ...keep };

	let userId: string;
	try {
		const { user } = await auth.api.createUser({
			body: { name, email, password, role: "user" },
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
		await flowable("/identity/users", "POST", {
			id: userId,
			firstName: name,
			email,
			password: randomUUID(),
		});
		await flowable(`/identity/groups/${groupKey}/members`, "POST", {
			userId,
		});
		await prisma.membership.create({ data: { userId, groupKey } });
	} catch (e) {
		console.error("CREATE USER:", e);
		await flowable(`/identity/users/${userId}`, "DELETE").catch(() => {});
		await auth.api
			.removeUser({ body: { userId }, headers: await headers() })
			.catch(() => {});
		return {
			error: "Utilizatorul nu a putut fi creat în Flowable",
			...keep,
		};
	}

	revalidatePath("/admin/users");
	return { ok: `Utilizatorul „${name}" a fost creat` };
}

export async function updateUser(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requireAdmin();
	const userId = String(formData.get("userId"));
	const email = String(formData.get("email"));
	const name = String(formData.get("name")).trim();
	const groupKey = String(formData.get("groupKey"));
	const password = String(formData.get("password"));

	if (!name || !groupKey) return { error: "Numele și grupul sunt obligatorii" };
	if (password && password.length < 8)
		return { error: "Parola: minim 8 caractere" };

	const membership = await prisma.membership.findUnique({
		where: { userId },
	});
	if (!membership) return { error: "Utilizatorul nu a fost găsit" };

	try {
		if (membership.groupKey !== groupKey && (await hasOpenTasks(userId)))
			return {
				error: "Utilizatorul are sarcini deschise, grupul nu poate fi schimbat",
			};

		const h = await headers();
		await auth.api.adminUpdateUser({
			body: { userId, data: { name } },
			headers: h,
		});
		if (password) {
			await auth.api.setUserPassword({
				body: { userId, newPassword: password },
				headers: h,
			});
		}

		await flowable(`/identity/users/${userId}`, "PUT", {
			firstName: name,
			email,
		});
		if (membership.groupKey !== groupKey) {
			await flowable(
				`/identity/groups/${membership.groupKey}/members/${userId}`,
				"DELETE",
			);
			await flowable(`/identity/groups/${groupKey}/members`, "POST", {
				userId,
			});
			await prisma.membership.update({
				where: { userId },
				data: { groupKey },
			});
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
	const admin = await requireAdmin();
	const userId = String(formData.get("userId"));
	if (userId === admin.id) return { error: "Nu îți poți șterge propriul cont" };

	const membership = await prisma.membership.findUnique({
		where: { userId },
	});
	if (!membership) return { error: "Utilizatorul nu a fost găsit" };

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

		await flowable(`/identity/users/${userId}`, "DELETE");
		await prisma.$transaction([
			prisma.notification.deleteMany({ where: { userId } }),
			prisma.membership.delete({ where: { userId } }),
		]);
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
