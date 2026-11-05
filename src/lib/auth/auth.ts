import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { ac, roles } from "@/lib/rbac/permissions";

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	emailAndPassword: { enabled: true, disableSignUp: true },
	plugins: [admin({ ac, roles, defaultRole: "user" })],
});
