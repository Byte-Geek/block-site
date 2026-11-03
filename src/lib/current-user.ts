import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return null;

	const membership = await prisma.membership.findUnique({
		where: { userId: session.user.id },
	});
	return { ...session.user, group: membership?.groupKey ?? null };
});

export async function requireUser() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	return user;
}
