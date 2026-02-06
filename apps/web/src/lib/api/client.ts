import type { AppType } from "@repo/api/client";
import { hc } from "hono/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function isServer(): boolean {
  return typeof window === "undefined";
}

async function getSessionToken(): Promise<string | null> {
  if (!isServer()) {
    return null; // Client-side uses proxy
  }
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get("session")?.value ?? null;
  } catch {
    return null;
  }
}

// Create typed RPC client with auth interceptor
export const api = hc<AppType>(API_BASE_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // Server-side: call backend directly with token
    if (isServer()) {
      const token = await getSessionToken();
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, {
        ...init,
        headers,
      });
    }

    // Client-side: route through Next.js API proxy
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const proxyUrl = url.replace(API_BASE_URL, "/api/proxy");
    return fetch(proxyUrl, init);
  },
});

export type ApiClient = typeof api;
