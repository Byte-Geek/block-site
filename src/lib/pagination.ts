export const PAGE_SIZES = [10, 50, 100];
export const DEFAULT_PAGE_SIZE = 50;

export function pageSizeFrom(value?: string) {
	const n = Number(value);
	return PAGE_SIZES.includes(n) ? n : DEFAULT_PAGE_SIZE;
}
