import { cookies } from "next/headers";
import { type ReactNode, Suspense } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { can, isAdmin, type Role, roleLabels } from "@/lib/rbac/permissions";

async function Shell({ children }: { children: ReactNode }) {
	const user = await requireUser();
	const admin = isAdmin(user.role);

	const [unread, cookieStore] = await Promise.all([
		prisma.notification.count({
			where: { userId: user.id, readAt: null },
		}),
		cookies(),
	]);
	const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

	return (
		<TooltipProvider delayDuration={0}>
			<SidebarProvider defaultOpen={defaultOpen}>
				<AppSidebar
					isAdmin={admin}
					isInitiator={can(user.role, "case", "create")}
				/>
				<SidebarInset>
					<AppHeader
						name={user.name}
						email={user.email}
						roleLabel={roleLabels[user.role as Role] ?? roleLabels.user}
						unread={admin ? null : unread}
					/>
					<div className="flex flex-1 flex-col">{children}</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}

export default function AppLayout({ children }: { children: ReactNode }) {
	return (
		<Suspense fallback={<Skeleton className="m-8 h-8 w-48" />}>
			<Shell>{children}</Shell>
		</Suspense>
	);
}
