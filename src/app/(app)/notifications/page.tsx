import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { markAllRead } from "./actions";

export default async function NotificationsPage() {
	const user = await requireUser();

	const [items, unread] = await Promise.all([
		prisma.notification.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "desc" },
			take: 100,
			include: { case: { select: { number: true } } },
		}),
		prisma.notification.count({ where: { userId: user.id, readAt: null } }),
	]);

	return (
		<PageShell className="max-w-3xl">
			<PageHeader
				title="Notificări"
				description={
					unread === 0
						? "Toate sunt citite"
						: unread === 1
							? "O notificare necitită"
							: `${unread} notificări necitite`
				}
				actions={
					unread > 0 && (
						<form action={markAllRead}>
							<Button variant="outline" size="sm">
								<CheckCheck />
								Marchează toate ca citite
							</Button>
						</form>
					)
				}
			/>

			{items.length === 0 ? (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
					<div className="flex size-10 items-center justify-center rounded-full bg-muted">
						<Bell className="size-5 text-muted-foreground" />
					</div>
					<p className="font-medium">Nu ai notificări</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						Vei fi anunțat aici când un caz are nevoie de atenția ta.
					</p>
				</div>
			) : (
				<>
					<ul className="divide-y overflow-hidden rounded-xl border bg-card">
						{items.map((n) => (
							<li key={n.id}>
								<Link
									href={`/cases/${n.case.number}`}
									className={cn(
										"flex items-start gap-3 p-4 transition-colors hover:bg-muted/50",
										!n.readAt && "bg-primary/5",
									)}
								>
									<span
										aria-hidden
										className={cn(
											"mt-1.5 size-2 shrink-0 rounded-full",
											n.readAt ? "bg-transparent" : "bg-primary",
										)}
									/>
									<div className="min-w-0 flex-1">
										<p
											className={cn(
												"text-sm",
												n.readAt ? "text-muted-foreground" : "font-medium",
											)}
										>
											{n.text}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Caz #{n.case.number} · {formatDateTime(n.createdAt)}
										</p>
									</div>
									<ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
								</Link>
							</li>
						))}
					</ul>
					{items.length === 100 && (
						<p className="text-center text-xs text-muted-foreground">
							Se afișează ultimele 100 de notificări.
						</p>
					)}
				</>
			)}
		</PageShell>
	);
}
