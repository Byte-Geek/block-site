"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";

type Props = { name: string; email: string; roleLabel: string };

export default function UserMenu({ name, email, roleLabel }: Props) {
	const router = useRouter();

	async function logout() {
		await authClient.signOut({});
		router.push("/login");
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-9 gap-2 px-2">
					<UserAvatar
						name={name}
						className="size-7 bg-primary text-primary-foreground"
					/>
					<span className="hidden text-sm sm:inline">{name}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="truncate text-sm font-medium">{name}</p>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
					<p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={logout}>
					<LogOut />
					Ieși din cont
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
