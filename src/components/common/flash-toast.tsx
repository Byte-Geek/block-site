"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const messages: Record<string, string> = {
	decision: "Decizia a fost înregistrată",
	isp: "Răspunsul a fost trimis",
	resubmit: "Lista a fost retrimisă",
	draft: "Ciorna a fost creată. Verifică lista și apasă Trimite.",
	sent: "Lista a fost trimisă la validarea ASP",
	cancelled: "Ciorna a fost ștearsă",
	replaced: "Lista a fost înlocuită. Verifică-o înainte să trimiți.",
	cancelledCase: "Cazul a fost anulat",
};

export default function FlashToast({
	ok,
	detail,
}: {
	ok?: string;
	detail?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!ok || !messages[ok]) return;
		toast.success(detail ? `${messages[ok]} ${detail}` : messages[ok], {
			id: `flash-${ok}`,
		});
		router.replace(pathname);
	}, [ok, detail, pathname, router]);

	return null;
}
