import { describe, expect, it } from "vitest";

import { convertGpsPoint } from "./amap-coordinates";

describe("AMap coordinate conversion", () => {
  it("converts a WGS-84 browser fix into a GCJ-02 map point", async () => {
    const point = await convertGpsPoint(
      {
        convertFrom: (_position, type, callback) => {
          expect(type).toBe("gps");
          callback("complete", {
            info: "ok",
            locations: [
              {
                getLng: () => 104.06931,
                getLat: () => 30.57042,
              },
            ],
          });
        },
      },
      { longitude: 104.0668, latitude: 30.5728 },
    );

    expect(point).toEqual({
      longitude: 104.06931,
      latitude: 30.57042,
    });
  });
});
