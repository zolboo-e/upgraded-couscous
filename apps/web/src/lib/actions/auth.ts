"use server";

import { parseResponse } from "hono/client";
import { decodeJwt } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "../api/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

async function setSessionCookie(token: string): Promise<void> {
  const payload = decodeJwt(token);
  const exp = payload.exp;

  if (!exp) {
    throw new Error("Token has no expiration");
  }

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const result = await parseResponse(api.auth.me.$get());
    return result.data.user;
  } catch {
    return null;
  }
}

export interface UserWithCompany {
  user: AuthUser;
  company: {
    id: string;
    name: string;
    role: "admin" | "member";
  } | null;
}

export async function getCurrentUserWithCompany(): Promise<UserWithCompany | null> {
  try {
    const result = await parseResponse(api.auth.me.company.$get());
    return result.data;
  } catch {
    return null;
  }
}

export async function login(
  data: { email: string; password: string },
  callbackUrl?: string,
): Promise<AuthResult> {
  try {
    const result = await parseResponse(api.auth.login.$post({ json: data }));
    await setSessionCookie(result.data.token);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
  redirect(callbackUrl ?? "/chats");
}

export async function register(
  data: { email: string; password: string; name?: string },
  callbackUrl?: string,
): Promise<AuthResult> {
  try {
    const result = await parseResponse(api.auth.register.$post({ json: data }));
    await setSessionCookie(result.data.token);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
  redirect(callbackUrl ?? "/chats");
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}

/**
 * Get the session token for WebSocket connections.
 * This is needed because browsers can't set Authorization headers on WebSocket.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value ?? null;
}
