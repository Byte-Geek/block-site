import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	if (!sessionCookie) {
		const url = new URL("/login", request.url);
		url.searchParams.set(
			"callbackURL",
			request.nextUrl.pathname + request.nextUrl.search,
		);
		return NextResponse.redirect(url);
	}
}

export const config = {
	matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
