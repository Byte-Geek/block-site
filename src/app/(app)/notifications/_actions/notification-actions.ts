"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function markAllRead() {
	const user = await requireUser();

	await prisma.notification.updateMany({
		where: { userId: user.id, readAt: null },
		data: { readAt: new Date() },
	});
	revalidatePath("/notifications");
}
