"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/flowable";
import { requireAdmin } from "@/lib/require-admin";

type State = { error?: string; ok?: string; key?: string; name?: string };

export async function createGroup(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requireAdmin();
	const key = String(formData.get("key")).trim().toLowerCase();
	const name = String(formData.get("name")).trim();

	if (!/^[a-z][a-z0-9-]*$/.test(key))
		return {
			error: "Cheia: litere mici, cifre și cratimă, începe cu literă",
			key,
			name,
		};
	if (!name) return { error: "Denumirea este obligatorie", key, name };
	if (await prisma.group.findUnique({ where: { key } }))
		return { error: "Cheia există deja", key, name };

	try {
		await flowable("/identity/groups", "POST", {
			id: key,
			name,
			type: "assignment",
		});
	} catch {
		return { error: "Grupul nu a putut fi creat în Flowable", key, name };
	}

	try {
		await prisma.group.create({ data: { key, name } });
	} catch {
		await flowable(`/identity/groups/${key}`, "DELETE").catch(() => {});
		return { error: "Grupul nu a putut fi salvat", key, name };
	}

	revalidatePath("/admin/groups");
	return { ok: `Grupul „${key}" a fost creat` };
}

export async function updateGroup(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requireAdmin();
	const key = String(formData.get("key"));
	const name = String(formData.get("name")).trim();
	if (!name) return { error: "Denumirea este obligatorie" };

	try {
		await flowable(`/identity/groups/${key}`, "PUT", {
			id: key,
			name,
			type: "assignment",
		});
		await prisma.group.update({ where: { key }, data: { name } });
	} catch (e) {
		console.error("UPDATE GROUP:", e);
		return { error: "Grupul nu a putut fi salvat" };
	}

	revalidatePath("/admin/groups");
	return { ok: "Grupul a fost salvat" };
}

export async function deleteGroup(
	_prev: State,
	formData: FormData,
): Promise<State> {
	await requireAdmin();

	const key = String(formData.get("key"));

	if (["initiator", "asp", "anr", "isp"].includes(key))
		return {
			error: "Grupul este folosit de proces și nu poate fi șters",
		};

	const members = await prisma.membership.count({
		where: { groupKey: key },
	});
	if (members > 0) return { error: "Grupul are membri și nu poate fi șters" };

	try {
		await flowable(`/identity/groups/${key}`, "DELETE");
		await prisma.group.delete({ where: { key } });
	} catch (e) {
		console.error("DELETE GROUP:", e);
		return { error: "Grupul nu a putut fi șters" };
	}

	revalidatePath("/admin/groups");
	return { ok: "Grupul a fost șters" };
}
