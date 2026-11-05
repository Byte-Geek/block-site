const labelPattern = /^[\p{L}\p{N}]([\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;

export function normalizeDomain(raw: string) {
	return raw.trim().toLowerCase();
}

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
