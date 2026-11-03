import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
	page: number;
	pages: number;
	total: number;
	size: number;
	href: (page: number, size?: number) => string;
	sizes?: number[];
	basePath?: string;
	extra?: Record<string, string>;
};

const fmt = (n: number) => n.toLocaleString("ro-RO");

function Nav({
	to,
	disabled,
	label,
	children,
}: {
	to: string;
	disabled: boolean;
	label: string;
	children: ReactNode;
}) {
	if (disabled)
		return (
			<Button variant="outline" size="icon" disabled aria-label={label}>
				{children}
			</Button>
		);
	return (
		<Button asChild variant="outline" size="icon" aria-label={label}>
			<Link href={to}>{children}</Link>
		</Button>
	);
}

export default function Pagination({
	page,
	pages,
	total,
	size,
	href,
	sizes,
	basePath,
	extra = {},
}: Props) {
	const from = total === 0 ? 0 : (page - 1) * size + 1;
	const to = Math.min(page * size, total);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
			<div className="flex flex-wrap items-center gap-3">
				<span>
					{total === 0
						? "0 rezultate"
						: `${fmt(from)}–${fmt(to)} din ${fmt(total)}`}
				</span>
				{sizes && (
					<div className="flex items-center gap-1">
						<span>Pe pagină:</span>
						{sizes.map((s) => (
							<Button
								key={s}
								asChild
								size="sm"
								variant={s === size ? "default" : "ghost"}
								className="h-7 px-2"
							>
								<Link href={href(1, s)}>{s}</Link>
							</Button>
						))}
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-1">
				<Nav to={href(1)} disabled={page <= 1} label="Prima pagină">
					<ChevronsLeft />
				</Nav>
				<Nav
					to={href(page - 1)}
					disabled={page <= 1}
					label="Pagina anterioară"
				>
					<ChevronLeft />
				</Nav>
				<span className="px-2">
					Pagina {fmt(page)} din {fmt(pages)}
				</span>
				<Nav
					to={href(page + 1)}
					disabled={page >= pages}
					label="Pagina următoare"
				>
					<ChevronRight />
				</Nav>
				<Nav
					to={href(pages)}
					disabled={page >= pages}
					label="Ultima pagină"
				>
					<ChevronsRight />
				</Nav>

				{basePath && pages > 5 && (
					<Form
						action={basePath}
						className="ml-2 flex items-center gap-1"
					>
						{Object.entries({
							...extra,
							...(sizes ? { size: String(size) } : {}),
						}).map(([name, value]) => (
							<input
								key={name}
								type="hidden"
								name={name}
								value={value}
							/>
						))}
						<Input
							name="page"
							type="number"
							min={1}
							max={pages}
							placeholder="Pagina"
							aria-label="Mergi la pagina"
							className="h-8 w-20"
						/>
						<Button type="submit" size="sm" variant="outline">
							Mergi
						</Button>
					</Form>
				)}
			</div>
		</div>
	);
}
