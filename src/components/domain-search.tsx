import { ArrowRight, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { StageBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { caseAccess } from "@/lib/case-access";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = {
	d: string;
	user: Parameters<typeof caseAccess>[0];
};

const LIMIT = 50;

export default async function DomainSearch({ d, user }: Props) {
	const access = caseAccess(user);
	if (!access) return null;

	const term = d.trim().toLowerCase();
	const cases = term
		? await prisma.case.findMany({
				where: {
					AND: [
						access.where,
						{ domains: { some: { value: { contains: term } } } },
					],
				},
				orderBy: { number: "desc" },
				take: LIMIT,
				select: {
					id: true,
					number: true,
					stage: true,
					createdAt: true,
					domains: {
						where: { value: { contains: term } },
						orderBy: { position: "asc" },
						take: 3,
						select: { id: true, value: true },
					},
					_count: {
						select: {
							domains: { where: { value: { contains: term } } },
						},
					},
				},
			})
		: [];

	return (
		<section className="flex flex-col gap-3">
			<Form action="/" className="flex gap-2">
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						name="d"
						defaultValue={d}
						placeholder="Caută un domeniu în toate cazurile"
						className="pl-8"
					/>
				</div>
				<Button type="submit">Caută</Button>
				{term && (
					<Button asChild variant="ghost">
						<Link href="/">Șterge</Link>
					</Button>
				)}
			</Form>

			{term && (
				<div className="overflow-hidden rounded-xl border bg-card">
					{cases.length === 0 ? (
						<p className="p-6 text-center text-sm text-muted-foreground">
							Niciun caz nu conține „{term}”.
						</p>
					) : (
						<>
							<p className="border-b px-4 py-2 text-sm text-muted-foreground">
								{cases.length === LIMIT
									? `Primele ${LIMIT} cazuri care conțin „${term}”`
									: cases.length === 1
										? `Un caz conține „${term}”`
										: `${cases.length} cazuri conțin „${term}”`}
							</p>
							<ul className="divide-y">
								{cases.map((c) => (
									<li
										key={c.id}
										className="flex flex-wrap items-center justify-between gap-3 p-4"
									>
										<div className="min-w-0">
											<p className="font-medium">
												Caz #{c.number}{" "}
												<span className="font-normal text-muted-foreground">
													· {formatDate(c.createdAt)}
												</span>
											</p>
											<p className="font-mono text-sm break-all text-muted-foreground">
												{c.domains
													.map((x) => x.value)
													.join(", ")}
												{c._count.domains >
													c.domains.length &&
													` și încă ${c._count.domains - c.domains.length}`}
											</p>
										</div>
										<div className="flex items-center gap-3">
											<StageBadge stage={c.stage} />
											<Button
												asChild
												size="sm"
												variant="outline"
											>
												<Link
													href={`/cases/${c.number}`}
												>
													Deschide cazul
													<ArrowRight />
												</Link>
											</Button>
										</div>
									</li>
								))}
							</ul>
						</>
					)}
				</div>
			)}
		</section>
	);
}
