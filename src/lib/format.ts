const timeZone = "Europe/Chisinau";

export const formatSize = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const formatDate = (d: Date) =>
	d.toLocaleDateString("ro-RO", { timeZone });

export const formatDateTime = (d: Date) =>
	d.toLocaleString("ro-RO", { timeZone });
