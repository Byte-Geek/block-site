import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";

const getCurrentUser = cache(async () => {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user ?? null;
});

export async function requireUser() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");
	return user;
}
