import { decodeJwt } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];
const STATIC_PATHS = ["/_next", "/favicon.ico", "/api"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes
  if (STATIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public auth pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify JWT is not expired
  try {
    const payload = decodeJwt(sessionCookie.value);

    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      // Token expired
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }

    return NextResponse.next();
  } catch {
    // Invalid token
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
