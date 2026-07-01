import { describe, expect, it } from "vitest";

import { inspectHealth } from "./health";

describe("health inspection", () => {
  it("reports local optional integrations without returning values", () => {
    const health = inspectHealth({
      NODE_ENV: "development",
      NEXT_PUBLIC_AMAP_JS_KEY: "public",
      AMAP_WEB_SERVICE_KEY: "secret",
    });
    expect(health.ok).toBe(true);
    expect(JSON.stringify(health)).not.toContain("secret");
  });

  it("requires database, maps and Coze in production", () => {
    expect(inspectHealth({ NODE_ENV: "production" }).ok).toBe(false);
    expect(
      inspectHealth({
        NODE_ENV: "production",
        PGDATABASE_URL: "postgres://configured",
        NEXT_PUBLIC_AMAP_JS_KEY: "configured",
        AMAP_JS_SECURITY_CODE: "configured",
        AMAP_WEB_SERVICE_KEY: "configured",
        COZE_WORKLOAD_IDENTITY_API_KEY: "configured",
      }).ok,
    ).toBe(true);
  });
});
