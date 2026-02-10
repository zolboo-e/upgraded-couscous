import { type NextRequest, NextResponse } from "next/server";

const GUEST_ROUTES = ["/login", "/register"];
const PROTECTED_ROUTE_PREFIXES = ["/chats", "/projects", "/organization"];

function isGuestRoute(pathname: string): boolean {
  return GUEST_ROUTES.includes(pathname);
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session");
  const hasSession = Boolean(sessionCookie?.value);

  // Guest-only routes: redirect users with session to /chats
  if (isGuestRoute(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/chats", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: redirect users without session to /login
  if (isProtectedRoute(pathname)) {
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/chats/:path*", "/projects/:path*", "/organization/:path*"],
};
