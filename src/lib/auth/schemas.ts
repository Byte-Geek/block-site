import { z } from "zod";

export const LoginSchema = z.object({
	email: z.email("Email invalid"),
	password: z.string().min(1, "Introdu parola"),
});
