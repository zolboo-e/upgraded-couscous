import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

  return fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error -- duplex required for streaming request bodies
    duplex: "half",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  return proxyRequest(request, `/${path.join("/")}`);
}
