import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import UserMenu from "./user-menu";

type Props = {
	name: string;
	email: string;
	roleLabel: string;
	unread: number | null;
};

export default function AppHeader({ name, email, roleLabel, unread }: Props) {
	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator
				orientation="vertical"
				className="mr-2 data-[orientation=vertical]:h-4"
			/>
			<div className="ml-auto flex items-center gap-1">
				{unread !== null && (
					<Button variant="ghost" size="icon" asChild className="relative">
						<Link
							href="/notifications"
							aria-label={`Notificări, ${unread} necitite`}
						>
							<Bell />
							{unread > 0 && (
								<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
									{unread > 99 ? "99+" : unread}
								</span>
							)}
						</Link>
					</Button>
				)}
				<UserMenu name={name} email={email} roleLabel={roleLabel} />
			</div>
		</header>
	);
}
