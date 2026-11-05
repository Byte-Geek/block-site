export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "25 MB";

const contentTypes: Record<string, string> = {
	".pdf": "application/pdf",
	".doc": "application/msword",
	".docx":
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls": "application/vnd.ms-excel",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const DOCUMENT_EXTENSIONS = Object.keys(contentTypes);
export const SPREADSHEET_EXTENSIONS = [".xlsx"];

const zipSignature = [0x50, 0x4b, 0x03, 0x04];
const oleSignature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function extensionOf(name: string) {
	const dot = name.lastIndexOf(".");
	return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

function startsWith(bytes: Uint8Array, signature: number[]) {
	return signature.every((byte, i) => bytes[i] === byte);
}

export function sanitizeFileName(name: string) {
	return (name.split(/[\\/]/).pop() || "fisier").slice(0, 255);
}

export function contentTypeOf(name: string) {
	return contentTypes[extensionOf(name)] ?? "application/octet-stream";
}

export function fileProblem(
	file: { name: string; size: number },
	extensions: string[],
) {
	if (!extensions.includes(extensionOf(file.name)))
		return `Format nepermis. Se acceptă doar: ${extensions.join(", ")}`;
	if (file.size === 0) return "Fișierul este gol";
	if (file.size > MAX_FILE_SIZE)
		return `Fișierul depășește ${MAX_FILE_SIZE_LABEL}`;
	return null;
}

export function matchesFileSignature(name: string, start: Uint8Array) {
	switch (extensionOf(name)) {
		case ".pdf":
			return new TextDecoder("latin1").decode(start).includes("%PDF-");
		case ".docx":
		case ".xlsx":
			return startsWith(start, zipSignature);
		case ".doc":
		case ".xls":
			return startsWith(start, oleSignature);
		default:
			return false;
	}
}
