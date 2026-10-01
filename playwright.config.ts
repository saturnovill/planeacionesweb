import { defineConfig, devices } from "@playwright/test";

process.loadEnvFile(".env.local");

// PORT_E2E=3000 reutiliza un `npm run dev` que ya esté corriendo.
const PORT = Number(process.env.PORT_E2E ?? 3100);
// E2E_BASE_URL=https://… corre las pruebas contra un despliegue (sin levantar servidor local).
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  // Los flujos comparten el mismo usuario y llaman a Gemini (≈20-60 s por generación).
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure", locale: "es-MX" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth.json" }, dependencies: ["setup"], testIgnore: /movil/ },
    { name: "movil", use: { ...devices["Pixel 7"], storageState: "e2e/.auth.json" }, dependencies: ["setup"], testMatch: /movil/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: `npx next dev -p ${PORT}`, port: PORT, reuseExistingServer: true, timeout: 120_000 },
});
