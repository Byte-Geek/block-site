import ExcelJS from "exceljs";

export function normalizeDomain(raw: string) {
	return raw.trim().toLowerCase();
}

const labelPattern = /^[\p{L}\p{N}]([\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;

export function domainProblem(value: string): string | null {
	if (!value) return "Domeniul nu poate fi gol";
	if (/\s/.test(value)) return "Conține spații";
	if (/^[a-z][a-z0-9+.-]*:\/\//.test(value))
		return "Elimină http:// sau https://";
	if (/[/\\?#@:,;"'*]/.test(value))
		return "Conține caractere nepermise (cale, port sau simboluri)";
	if (value.length > 253) return "Prea lung (maximum 253 de caractere)";
	if (value.endsWith(".")) return "Elimină punctul de la final";
	if (!value.includes(".")) return "Lipsește extensia (de exemplu .md)";

	const parts = value.split(".");
	for (const part of parts) {
		if (!part) return "Puncte puse greșit";
		if (part.length > 63)
			return "O parte a domeniului depășește 63 de caractere";
		if (!labelPattern.test(part))
			return "Format invalid (verifică cratimele și caracterele)";
	}
	if (!/\p{L}/u.test(parts[parts.length - 1]))
		return "Extensia trebuie să conțină litere (nu e o dată sau o adresă IP)";
	return null;
}

function looksLikeDomain(value: string) {
	return !/\s/.test(value) && value.includes(".") && /\p{L}/u.test(value);
}

const headerNames = [
	"domeniu",
	"domenii",
	"domain",
	"domains",
	"site",
	"url",
	"host",
];

function pickColumn(
	columns: Map<number, string[]>,
	header: Map<number, string>,
) {
	for (const [col, name] of header)
		if (headerNames.includes(normalizeDomain(name))) return col;

	let best = 0;
	let bestCount = 0;
	for (const [col, values] of columns) {
		const count = values.filter(looksLikeDomain).length;
		if (
			count > bestCount ||
			(count === bestCount && count > 0 && col < best)
		) {
			best = col;
			bestCount = count;
		}
	}
	return bestCount > 0 ? best : null;
}

export type ParsedDomains = {
	domains: string[];
	removedDuplicates: number;
	column: string;
};

export async function parseDomains(
	file: File | null,
): Promise<ParsedDomains | { error: string; details?: string[] }> {
	if (!file || file.size === 0) return { error: "Alege un fișier" };
	if (!file.name.toLowerCase().endsWith(".xlsx"))
		return { error: "Fișierul trebuie să fie .xlsx" };

	const columns = new Map<number, string[]>();
	const letters = new Map<number, string>();
	let header = new Map<number, string>();

	try {
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.load(
			Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer,
		);
		const sheet = wb.worksheets[0];

		let first = true;
		sheet.eachRow((row) => {
			const cells = new Map<number, string>();
			row.eachCell((cell, col) => {
				const text = cell.text.trim();
				if (text) cells.set(col, text);
			});
			if (cells.size === 0) return;

			if (first) {
				header = cells;
				first = false;
			}
			for (const [col, text] of cells) {
				const list = columns.get(col) ?? [];
				list.push(normalizeDomain(text));
				columns.set(col, list);
			}
		});

		for (const col of columns.keys())
			letters.set(col, sheet.getColumn(col).letter);
	} catch {
		return { error: "Fișierul nu a putut fi citit" };
	}

	if (columns.size === 0) return { error: "Lista este goală" };

	const col = pickColumn(columns, header);
	if (col === null) {
		const preview = [...columns]
			.sort(([a], [b]) => a - b)
			.slice(0, 6)
			.map(
				([c, values]) =>
					`Coloana ${letters.get(c)}: ${values.slice(0, 3).join(", ")}`,
			);
		return {
			error: "Nu am găsit o coloană cu domenii în fișier.",
			details: preview,
		};
	}

	const rows = [...(columns.get(col) ?? [])];
	if (header.has(col) && rows.length > 0 && !looksLikeDomain(rows[0]))
		rows.shift();
	if (rows.length === 0) return { error: "Lista este goală" };
	if (rows.length > 50000)
		return { error: "Lista este prea mare (maximum 50.000 de domenii)" };

	const seen = new Set<string>();
	const domains: string[] = [];
	for (const d of rows) {
		if (seen.has(d)) continue;
		seen.add(d);
		domains.push(d);
	}

	return {
		domains,
		removedDuplicates: rows.length - domains.length,
		column: letters.get(col) ?? String(col),
	};
}
