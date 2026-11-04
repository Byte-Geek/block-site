import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

export async function requireAdmin() {
	const user = await requireUser();
	if (user.role !== "admin") redirect("/");
	return user;
}
