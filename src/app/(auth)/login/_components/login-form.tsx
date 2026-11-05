"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ShieldBan } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

const LoginSchema = z.object({
	email: z.email("Email invalid"),
	password: z.string().min(1, "Introdu parola"),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginInput>({
		resolver: zodResolver(LoginSchema),
		mode: "onTouched",
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(input: LoginInput) {
		const { error } = await authClient.signIn.email(input);
		if (error) {
			setError("root", { message: "Email sau parolă greșite" });
			return;
		}
		const next = searchParams.get("callbackURL");
		router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
	}

	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
			<div className="flex items-center gap-2 font-medium">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<ShieldBan className="size-4" />
				</div>
				Blocare site-uri
			</div>

			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="text-xl">Autentificare</CardTitle>
					<CardDescription>
						Introdu emailul și parola contului tău
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={handleSubmit(onSubmit)}
						noValidate
						className="flex flex-col gap-4"
					>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								placeholder="nume@exemplu.md"
								aria-invalid={!!errors.email}
								{...register("email")}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="password">Parolă</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								aria-invalid={!!errors.password}
								{...register("password")}
							/>
							{errors.password && (
								<p className="text-sm text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>

						{errors.root && (
							<p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
								{errors.root.message}
							</p>
						)}

						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <LoaderCircle className="animate-spin" />}
							{isSubmitting ? "Se verifică..." : "Intră"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
