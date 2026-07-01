import { NextResponse } from "next/server";

import { AMapServiceError, searchNearby } from "../../../../server/amap";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("longitude"));
  const latitude = Number(url.searchParams.get("latitude"));
  const radius = Number(url.searchParams.get("radius") ?? 1800);

  try {
    const places = await searchNearby(
      { longitude, latitude, radius },
      { key: process.env.AMAP_WEB_SERVICE_KEY },
    );
    return NextResponse.json({ places, source: "amap" });
  } catch (error) {
    const code =
      error instanceof AMapServiceError
        ? error.code
        : "AMAP_UNAVAILABLE";
    const status = code === "INVALID_COORDINATES" ? 400 : 503;
    return NextResponse.json({ error: code }, { status });
  }
}
