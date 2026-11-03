const timeZone = "Europe/Chisinau";

export const formatDate = (d: Date) =>
	d.toLocaleDateString("ro-RO", { timeZone });

export const formatDateTime = (d: Date) =>
	d.toLocaleString("ro-RO", { timeZone });
