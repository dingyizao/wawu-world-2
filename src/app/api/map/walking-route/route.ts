import { NextResponse } from "next/server";

import { AMapServiceError, walkingRoute } from "../../../../server/amap";

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const route = await walkingRoute(
      {
        origin: {
          longitude: Number(url.searchParams.get("originLongitude")),
          latitude: Number(url.searchParams.get("originLatitude")),
        },
        destination: {
          longitude: Number(url.searchParams.get("destinationLongitude")),
          latitude: Number(url.searchParams.get("destinationLatitude")),
        },
      },
      { key: process.env.AMAP_WEB_SERVICE_KEY },
    );
    return NextResponse.json({ route, source: "amap" });
  } catch (error) {
    const code =
      error instanceof AMapServiceError
        ? error.code
        : "AMAP_UNAVAILABLE";
    const status = code === "INVALID_COORDINATES" ? 400 : 503;
    return NextResponse.json({ error: code }, { status });
  }
}
