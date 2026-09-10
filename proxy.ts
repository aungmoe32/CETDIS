import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  request.headers.set("x-pathname", pathname);

  // updateSession refreshes the session cookie AND returns the current user.
  // Both happen inside the same client, so refreshed tokens are never lost.
  const { supabaseResponse, user } = await updateSession(request);

  // Already authenticated user trying to access public auth paths (e.g. /login) -> redirect to root
  if (user && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Public paths for unauthenticated users — let them through.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // Protected path, no session — redirect to login.
  if (!user) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated — return the response with refreshed cookies attached.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|serwist|~offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|woff|woff2)$).*)",
  ],
};
