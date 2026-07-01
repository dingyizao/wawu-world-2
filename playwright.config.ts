import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:60553",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm dev --port 60553",
    url: "http://localhost:60553",
    reuseExistingServer: true,
  },
});
