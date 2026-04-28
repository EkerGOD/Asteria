export type HealthResponse = {
  status: "ok";
  service: string;
  version: string;
  environment: "development" | "test" | "production";
  database_configured: boolean;
};
