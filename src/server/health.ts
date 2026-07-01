type Environment = Record<string, string | undefined>;

export function inspectHealth(environment: Environment = process.env) {
  const production = environment.NODE_ENV === "production";
  const integrations = {
    database: Boolean(
      environment.DATABASE_URL ||
      environment.POSTGRES_URL ||
      environment.COZE_DATABASE_URL,
    ),
    amapJs: Boolean(environment.NEXT_PUBLIC_AMAP_JS_KEY),
    amapSecurityProxy: Boolean(environment.AMAP_JS_SECURITY_CODE),
    amapWebService: Boolean(environment.AMAP_WEB_SERVICE_KEY),
    cozeModel: Boolean(environment.COZE_WORKLOAD_IDENTITY_API_KEY),
  };
  const ready =
    integrations.database &&
    integrations.amapJs &&
    integrations.amapSecurityProxy &&
    integrations.amapWebService &&
    integrations.cozeModel;
  return {
    ok: production ? ready : true,
    runtime: production ? "production" : "development",
    storage: integrations.database ? "postgres" : "file",
    integrations,
  };
}
