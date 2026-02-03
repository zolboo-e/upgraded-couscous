/**
 * JWT validation service for the sandbox worker.
 * Uses the same JWT_SECRET as the API for token verification.
 */

import { type JWTPayload, jwtVerify } from "jose";

export interface JWTUserPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string | null;
}

/**
 * Verify a JWT token using the shared secret
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTUserPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.userId || !payload.email) {
      return null;
    }

    return payload as JWTUserPayload;
  } catch {
    return null;
  }
}

/**
 * Extract JWT token from Authorization header or cookie
 */
export function extractToken(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Try cookie
  const cookies = request.headers.get("Cookie");
  if (cookies) {
    const sessionCookie = cookies.split(";").find((c) => c.trim().startsWith("session="));
    if (sessionCookie) {
      return sessionCookie.split("=")[1]?.trim() ?? null;
    }
  }

  return null;
}
