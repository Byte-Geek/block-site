import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";

export async function requireGroup(groupKey: string) {
	const user = await requireUser();
	if (user.group !== groupKey) redirect("/");
	return user;
}
