import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/api/client";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyRequest(request: NextRequest, path: string): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  const url = new URL(path, API_BASE_URL);
  url.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.delete("host");

  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error -- duplex required for streaming request bodies
    duplex: "half",
  });

  // Strip encoding headers - Node.js fetch auto-decompresses responses,
  // but preserves the original headers, causing browser decode failures
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

async function handler(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
