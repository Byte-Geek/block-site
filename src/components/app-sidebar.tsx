"use client";

import {
	Bell,
	FilePlus2,
	FolderOpen,
	LayoutDashboard,
	ListChecks,
	type LucideIcon,
	ShieldBan,
	Users,
	UsersRound,
	Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavSection = { label: string; items: NavItem[] };

const userSections: NavSection[] = [
	{
		label: "Lucru",
		items: [
			{ href: "/", label: "Panou", icon: LayoutDashboard },
			{ href: "/tasks", label: "Sarcini", icon: ListChecks },
			{ href: "/cases", label: "Cazuri", icon: FolderOpen },
			{ href: "/notifications", label: "Notificări", icon: Bell },
		],
	},
];

const initiatorSections: NavSection[] = [
	{
		label: "Lucru",
		items: [
			{ href: "/", label: "Panou", icon: LayoutDashboard },
			{ href: "/cases", label: "Cazurile mele", icon: FolderOpen },
			{ href: "/cases/new", label: "Listă nouă", icon: FilePlus2 },
			{ href: "/notifications", label: "Notificări", icon: Bell },
		],
	},
];

const adminSections: NavSection[] = [
	{
		label: "Lucru",
		items: [
			{ href: "/", label: "Panou", icon: LayoutDashboard },
			{ href: "/cases", label: "Cazuri", icon: FolderOpen },
		],
	},
	{
		label: "Administrare",
		items: [
			{ href: "/admin/users", label: "Utilizatori", icon: Users },
			{ href: "/admin/groups", label: "Grupuri", icon: UsersRound },
			{
				href: "/admin/process",
				label: "Schema procesului",
				icon: Workflow,
			},
		],
	},
];

type Props = { isAdmin: boolean; isInitiator: boolean };

export default function AppSidebar({ isAdmin, isInitiator }: Props) {
	const pathname = usePathname();
	const sections = isAdmin
		? adminSections
		: isInitiator
			? initiatorSections
			: userSections;

	const activeHref = sections
		.flatMap((s) => s.items)
		.filter(
			(item) =>
				pathname === item.href ||
				(item.href !== "/" && pathname.startsWith(`${item.href}/`)),
		)
		.sort((a, b) => b.href.length - a.href.length)[0]?.href;

	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/">
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<ShieldBan className="size-4" />
								</div>
								<span className="font-medium">Blocare site-uri</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{sections.map((section) => (
					<SidebarGroup key={section.label}>
						<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{section.items.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={item.href === activeHref}
											tooltip={item.label}
											className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
										>
											<Link href={item.href}>
												<item.icon />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
		</Sidebar>
	);
}
