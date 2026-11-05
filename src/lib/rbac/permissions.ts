import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statement = {
	...defaultStatements,
	case: ["create", "readOwn", "readApproved", "readAll"],
	task: ["claim", "decide", "execute", "release"],
	note: ["create"],
	file: ["upload"],
	process: ["manage"],
} as const;

export type Statement = typeof statement;

export const ac = createAccessControl(statement);

export const roles = {
	user: ac.newRole({}),
	initiator: ac.newRole({
		case: ["create", "readOwn"],
		note: ["create"],
		file: ["upload"],
	}),
	asp: ac.newRole({
		case: ["readAll"],
		task: ["claim", "decide"],
		note: ["create"],
		file: ["upload"],
	}),
	anr: ac.newRole({
		case: ["readAll"],
		task: ["claim", "decide"],
		note: ["create"],
		file: ["upload"],
	}),
	isp: ac.newRole({
		case: ["readApproved"],
		task: ["claim", "execute"],
		note: ["create"],
		file: ["upload"],
	}),
	admin: ac.newRole({
		...adminAc.statements,
		case: ["readAll"],
		task: ["release"],
		note: ["create"],
		file: ["upload"],
		process: ["manage"],
	}),
};

export type Role = keyof typeof roles;

export const roleLabels: Record<Role, string> = {
	user: "Fără rol",
	initiator: "Inițiator",
	asp: "ASP",
	anr: "ANRCETI",
	isp: "ISP",
	admin: "Administrator",
};

export const processRoles = ["initiator", "asp", "anr", "isp"] as const;

export function can<R extends keyof Statement>(
	role: string | null | undefined,
	resource: R,
	action: Statement[R][number],
) {
	if (!role || !(role in roles)) return false;
	return roles[role as Role].authorize({ [resource]: [action] } as never)
		.success;
}

export function rolesWith<R extends keyof Statement>(
	resource: R,
	action: Statement[R][number],
) {
	return (Object.keys(roles) as Role[]).filter((role) =>
		can(role, resource, action),
	);
}

export const isAdmin = (role: string | null | undefined) =>
	can(role, "user", "list");
