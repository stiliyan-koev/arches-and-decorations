import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Smoke tests: a few read-only specs that browse the site like a visitor.
// Run `npm run build` first, then `npm run smoke`.

// Load .env.local the same way Next does, so the specs see the same Supabase
// URL and anon key as the site they test.
loadEnvConfig(process.cwd());

// Not 3000, so it never collides with `npm run dev`.
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/smoke",
  // One spec at a time. There are only a few, and the output stays readable.
  workers: 1,
  // One retry: a spec that only passes the second time is reported as "flaky"
  // instead of failing the whole run over a network blip.
  retries: 1,
  reporter: [
    ["list"],
    // Playwright's own results. /smoke-test and /smoke-fix read this file.
    ["json", { outputFile: "test-results/smoke.json" }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Serves the production build from `npm run build`. Never a dev server.
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
