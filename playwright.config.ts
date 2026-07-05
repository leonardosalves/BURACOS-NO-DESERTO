import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5176",
    headless: true,
    trace: "off",
  },
  webServer: [
    {
      command: "node server.js",
      cwd: "dashboard-qanat/backend",
      port: 3005,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "dashboard-qanat/frontend",
      port: 5176,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
