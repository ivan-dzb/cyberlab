import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas end-to-end contra la pila real (docker compose up -d):
 * app, db, orquestador, gateway y las imágenes de los retos construidas.
 * Se ejecutan en serie: comparten la base de datos y cada usuario solo puede tener una sesión de reto activa.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-ES",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
