import ExcelJS from "exceljs";
import { normalizeDomain } from "@/lib/cases/domain-format";
import { fileProblem, SPREADSHEET_EXTENSIONS } from "@/lib/storage/file-rules";

const MAX_DOMAINS_PER_LIST = 50000;

const headerNames = [
	"domeniu",
	"domenii",
	"domain",
	"domains",
	"site",
	"url",
	"host",
];

type ParsedDomains = {
	domains: string[];
	removedDuplicates: number;
	column: string;
};

export function listLoadedParams(column: string, removedDuplicates: number) {
	return `col=${column}${removedDuplicates > 0 ? `&dup=${removedDuplicates}` : ""}`;
}

function looksLikeDomain(value: string) {
	return !/\s/.test(value) && value.includes(".") && /\p{L}/u.test(value);
}

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
		if (count > bestCount || (count === bestCount && count > 0 && col < best)) {
			best = col;
			bestCount = count;
		}
	}
	return bestCount > 0 ? best : null;
}

export async function parseDomains(
	file: File | null,
): Promise<ParsedDomains | { error: string; details?: string[] }> {
	if (!file) return { error: "Alege un fișier" };
	const problem = fileProblem(file, SPREADSHEET_EXTENSIONS);
	if (problem) return { error: problem };

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
	if (rows.length > MAX_DOMAINS_PER_LIST)
		return { error: "Lista este prea mare (maximum 50.000 de domenii)" };

	const domains = [...new Set(rows)];

	return {
		domains,
		removedDuplicates: rows.length - domains.length,
		column: letters.get(col) ?? String(col),
	};
}
