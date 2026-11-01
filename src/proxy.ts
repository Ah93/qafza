import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "./lib/session-token";

/**
 * Optimistic redirects only: signed-out visitors are sent to the login page instead of an empty shell.
 * The real checks are in the API routes (`requireUser`), which re-read the user from the database.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const uid = await readSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!uid) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

// pages that need an account. Public: landing, auth pages, /join and /play/* (students need no account), galleries, legal pages.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/create/:path*",
    "/lessons/:path*",
    "/classes/:path*",
    "/results/:path*",
    "/account/:path*",
    "/pricing/:path*",
    "/live/:path*",
    "/learn/:path*",
    "/verify",
  ],
};
