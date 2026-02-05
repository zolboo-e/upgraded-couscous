"use server";

import { decodeJwt } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthErrorResponse {
  error?: {
    message: string;
  };
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

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${sessionCookie.value}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.data.user;
}

export async function login(
  data: { email: string; password: string },
  callbackUrl?: string,
): Promise<never> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: AuthErrorResponse = await response.json();
    throw new Error(error.error?.message ?? "Login failed");
  }

  const result = await response.json();
  await setSessionCookie(result.data.token);
  redirect(callbackUrl ?? "/chats");
}

export async function register(
  data: { email: string; password: string; name?: string },
  callbackUrl?: string,
): Promise<never> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: AuthErrorResponse = await response.json();
    throw new Error(error.error?.message ?? "Registration failed");
  }

  const result = await response.json();
  await setSessionCookie(result.data.token);
  redirect(callbackUrl ?? "/chats");
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
