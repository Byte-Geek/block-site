"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";

export async function markAllRead() {
	const user = await requireUser();

	await prisma.notification.updateMany({
		where: { userId: user.id, readAt: null },
		data: { readAt: new Date() },
	});
	revalidatePath("/notifications");
}
