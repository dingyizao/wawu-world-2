import { describe, expect, it, vi } from "vitest";

import { AMapServiceError, searchNearby, walkingRoute } from "./amap";

const key = "server-secret-key";

describe("AMap server adapter", () => {
  it("sends the server key only to the official REST host and caps radius", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      expect(url.origin).toBe("https://restapi.amap.com");
      expect(url.searchParams.get("key")).toBe(key);
      expect(url.searchParams.get("radius")).toBe("3000");
      return new Response(
        JSON.stringify({
          status: "1",
          pois: [
            {
              id: "poi-1",
              name: "人民公园",
              location: "104.063,30.663",
              address: "祠堂街少城路",
              typecode: "110101",
              distance: "420",
            },
          ],
        }),
      );
    });

    const result = await searchNearby(
      { longitude: 104.06, latitude: 30.67, radius: 9000 },
      { key, fetcher },
    );

    expect(result).toEqual([
      {
        id: "poi-1",
        name: "人民公园",
        longitude: 104.063,
        latitude: 30.663,
        address: "祠堂街少城路",
        typecode: "110101",
        distance: 420,
      },
    ]);
  });

  it("rejects invalid coordinates before fetching", async () => {
    const fetcher = vi.fn();

    await expect(
      searchNearby(
        { longitude: 181, latitude: 30, radius: 1000 },
        { key, fetcher },
      ),
    ).rejects.toMatchObject({ code: "INVALID_COORDINATES" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("converts provider failures to a key-free public error", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error(`request failed for ${key}`);
    });

    let caught: unknown;
    try {
      await searchNearby(
        { longitude: 104.06, latitude: 30.67, radius: 1000 },
        { key, fetcher },
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AMapServiceError);
    expect(caught).toMatchObject({ code: "AMAP_UNAVAILABLE" });
    expect(String(caught)).not.toContain(key);
  });

  it("returns a minimal walking route", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = new URL(input);
      expect(url.pathname).toBe("/v5/direction/walking");
      expect(url.searchParams.get("origin")).toBe("104.06,30.67");
      expect(url.searchParams.get("destination")).toBe("104.07,30.68");
      return new Response(
        JSON.stringify({
          status: "1",
          route: {
            paths: [
              {
                distance: "1530",
                cost: { duration: "1180" },
                steps: [
                  { polyline: "104.060000,30.670000;104.065000,30.675000" },
                  { polyline: "104.065000,30.675000;104.070000,30.680000" },
                ],
              },
            ],
          },
        }),
      );
    });

    await expect(
      walkingRoute(
        {
          origin: { longitude: 104.06, latitude: 30.67 },
          destination: { longitude: 104.07, latitude: 30.68 },
        },
        { key, fetcher },
      ),
    ).resolves.toEqual({
      distance: 1530,
      duration: 1180,
      path: [
        [104.06, 30.67],
        [104.065, 30.675],
        [104.07, 30.68],
      ],
    });
  });
});
