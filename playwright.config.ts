import { defineConfig, devices } from "@playwright/test";

// Override with SMOKE_PORT when 5273 is taken locally; CI uses the default.
const PORT = Number(process.env.SMOKE_PORT) || 5273;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI workers: the smoke suite grew with each shipped module; serial (1 worker)
  // crossed the CI job's wall-clock cap. 2 workers (ubuntu-latest has >=2 vCPUs)
  // roughly halves it; tests are MSW-isolated + clearCookies-per-test so they
  // parallelize safely, and retries:2 still covers any transient contention.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -w @kmosf/crm-admin -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_USE_MOCKS: "true",
    },
  },
});
