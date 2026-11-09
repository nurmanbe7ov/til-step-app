import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const authPages = new Set(["/login", "/forgot-password"]);

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    return cookie.name.startsWith("sb-") && cookie.name.includes("auth-token");
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    if (pathname === "/") {
      return redirectTo(request, "/dashboard");
    }

    return NextResponse.next();
  }

  const isCallback = pathname === "/auth/callback";
  const isAuthPage = authPages.has(pathname);
  const signedIn = hasAuthCookie(request);

  if (!signedIn && !isAuthPage && !isCallback) {
    return redirectTo(request, "/login");
  }

  if (pathname === "/") {
    return redirectTo(request, signedIn ? "/dashboard" : "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
