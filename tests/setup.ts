import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Entorno de pruebas: nunca se usan secretos reales.
process.env.ORCH_URL = "http://orchestrator.test:4000";
process.env.ORCH_TOKEN = "t".repeat(64);
process.env.LAB_BASE_URL = "http://{sid}.lab.localhost:8081";

afterEach(() => {
  // Solo aplica a los tests con DOM; en entorno node no hace nada.
  if (typeof document !== "undefined") cleanup();
});
