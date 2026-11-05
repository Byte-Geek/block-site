import "dotenv/config";
import { auth } from "../src/lib/auth/auth";

async function main() {
	const email = process.env.SEED_ADMIN_EMAIL;
	const password = process.env.SEED_ADMIN_PASSWORD;
	if (!email || !password) {
		throw new Error("SEED_ADMIN_EMAIL și SEED_ADMIN_PASSWORD sunt obligatorii");
	}
	const ctx = await auth.$context;

	const existing = await ctx.internalAdapter.findUserByEmail(email);
	if (existing) {
		console.log("Adminul există deja");
		return;
	}

	const user = await ctx.internalAdapter.createUser(
		{
			email,
			name: "Admin",
			role: "admin",
			emailVerified: true,
		},
		{ method: "admin" },
	);

	await ctx.internalAdapter.linkAccount({
		userId: user.id,
		providerId: "credential",
		accountId: user.id,
		password: await ctx.password.hash(password),
	});

	console.log("Admin creat:", email);
}

main().then(() => process.exit(0));
