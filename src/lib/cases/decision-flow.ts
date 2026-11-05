import type { Role } from "@/lib/rbac/permissions";

type Step = {
	next: string;
	message: string;
	notify: { roles: Role[] } | "creator";
};

export const decisionFlow: Record<string, Record<"da" | "nu", Step>> = {
	asp: {
		da: {
			next: "anr",
			message: "așteaptă validarea ANRCETI",
			notify: { roles: ["anr"] },
		},
		nu: {
			next: "initiator",
			message: "a fost respins de ASP",
			notify: "creator",
		},
	},
	anr: {
		da: {
			next: "isp",
			message: "așteaptă blocarea de către ISP",
			notify: { roles: ["isp"] },
		},
		nu: {
			next: "asp",
			message: "a fost respins de ANRCETI",
			notify: { roles: ["asp"] },
		},
	},
};
