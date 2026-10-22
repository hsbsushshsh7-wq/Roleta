import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [["list"], ["json", { outputFile: "docs/e2e-results.json" }]],
  use: {
    baseURL: "http://localhost:8081",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview:web",
    url: "http://localhost:8081",
    reuseExistingServer: true,
  },
});
