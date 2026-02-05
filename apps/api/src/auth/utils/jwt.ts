import { type JWTPayload, jwtVerify, SignJWT } from "jose";
import { env } from "../../config/env.js";

const SESSION_DURATION = "7d";

export interface JWTUserPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string | null;
}

const getSecretKey = (): Uint8Array => {
  return new TextEncoder().encode(env.JWT_SECRET);
};

export async function generateJWT(payload: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  return { token, expiresAt };
}

export async function verifyJWT(token: string): Promise<JWTUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
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
