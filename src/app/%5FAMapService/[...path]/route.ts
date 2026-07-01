import { type NextRequest, NextResponse } from "next/server";

import { buildAmapProxyUrl } from "../../../server/amap-proxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const target = buildAmapProxyUrl(
      path,
      request.nextUrl.searchParams,
      process.env.AMAP_JS_SECURITY_CODE,
    );
    const response = await fetch(target, {
      headers: { accept: request.headers.get("accept") ?? "*/*" },
      cache: "no-store",
    });
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    headers.set("cache-control", "private, max-age=300");
    return new NextResponse(response.body, {
      headers,
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "AMAP_PROXY_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
