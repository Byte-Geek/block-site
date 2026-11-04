const MAX_INT = 2147483647;

export function parseCaseNumber(value: unknown) {
	const n = Number(value);
	return Number.isInteger(n) && n >= 1 && n <= MAX_INT ? n : null;
}
