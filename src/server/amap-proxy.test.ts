import { describe, expect, it } from "vitest";

import { buildAmapProxyUrl } from "./amap-proxy";

describe("AMap JS security proxy", () => {
  it("routes style requests to the official Web API host", () => {
    const url = buildAmapProxyUrl(
      ["v4", "map", "styles"],
      new URLSearchParams("styleId=demo"),
      "server-only-code",
    );

    expect(url.origin).toBe("https://webapi.amap.com");
    expect(url.pathname).toBe("/v4/map/styles");
    expect(url.searchParams.get("jscode")).toBe("server-only-code");
  });

  it("routes service requests to the official REST host", () => {
    const url = buildAmapProxyUrl(
      ["v3", "place", "around"],
      new URLSearchParams("location=104,30"),
      "server-only-code",
    );

    expect(url.origin).toBe("https://restapi.amap.com");
    expect(url.pathname).toBe("/v3/place/around");
  });

  it("rejects traversal and missing security configuration", () => {
    expect(() =>
      buildAmapProxyUrl(["..", "private"], new URLSearchParams(), "code"),
    ).toThrow("AMAP_PROXY_PATH_INVALID");
    expect(() =>
      buildAmapProxyUrl(["v3", "place"], new URLSearchParams(), undefined),
    ).toThrow("AMAP_SECURITY_CODE_MISSING");
  });
});
