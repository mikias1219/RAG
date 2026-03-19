import { NextRequest, NextResponse } from "next/server";

const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);

function getBackendBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/+$/, "");
  return "http://localhost:8080/api";
}

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!allowedMethods.has(req.method)) {
    return NextResponse.json({ error: { message: `Method ${req.method} not allowed` } }, { status: 405 });
  }

  const path = (ctx.params.path ?? []).join("/");
  const target = new URL(`${getBackendBaseUrl()}/${path}`);

  // Preserve incoming query parameters.
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    cache: "no-store",
    redirect: "manual"
  };

  try {
    const upstream = await fetch(target, init);
    const outHeaders = new Headers(upstream.headers);
    outHeaders.delete("content-encoding");
    outHeaders.delete("transfer-encoding");
    return new NextResponse(upstream.body, { status: upstream.status, headers: outHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: "Backend service unavailable",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
