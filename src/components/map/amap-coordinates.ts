import type { MapPoint } from "../../domain/map-interactions";

type CoordinateConverter = {
  convertFrom: (
    position: [number, number],
    type: "gps",
    callback: (
      status: "complete" | "no_data" | "error",
      result: {
        info?: string;
        locations?: Array<{
          getLng: () => number;
          getLat: () => number;
        }>;
      },
    ) => void,
  ) => void;
};

export function convertGpsPoint(
  AMap: CoordinateConverter,
  point: MapPoint,
): Promise<MapPoint> {
  return new Promise((resolve, reject) => {
    AMap.convertFrom(
      [point.longitude, point.latitude],
      "gps",
      (status, result) => {
        const converted = result.locations?.[0];
        if (status !== "complete" || result.info !== "ok" || !converted) {
          reject(new Error("AMAP_COORDINATE_CONVERSION_FAILED"));
          return;
        }
        resolve({
          longitude: converted.getLng(),
          latitude: converted.getLat(),
        });
      },
    );
  });
}
