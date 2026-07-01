const REST_ORIGIN = "https://restapi.amap.com";
const WEB_API_ORIGIN = "https://webapi.amap.com";

export function buildAmapProxyUrl(
  path: string[],
  searchParams: URLSearchParams,
  securityCode?: string,
) {
  if (!securityCode) {
    throw new Error("AMAP_SECURITY_CODE_MISSING");
  }
  if (
    path.length === 0 ||
    path.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment) || segment === "..")
  ) {
    throw new Error("AMAP_PROXY_PATH_INVALID");
  }

  const pathname = `/${path.join("/")}`;
  const origin =
    pathname === "/v4/map/styles" ? WEB_API_ORIGIN : REST_ORIGIN;
  const url = new URL(pathname, origin);
  for (const [key, value] of searchParams) {
    if (key !== "jscode") {
      url.searchParams.append(key, value);
    }
  }
  url.searchParams.set("jscode", securityCode);
  return url;
}
