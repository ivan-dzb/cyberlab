// Construye la imagen Docker de cada reto (challenges/*/Dockerfile) con el nombre de challenge.json.
// Se ejecuta en el host (necesita el CLI de Docker): npm run build:challenges [slug]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "challenges");
const only = process.argv[2];

for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name === "_template" || (only && dir.name !== only)) continue;
  const base = path.join(root, dir.name);
  if (!existsSync(path.join(base, "Dockerfile")) || !existsSync(path.join(base, "challenge.json"))) continue;
  const { imagen_docker: image } = JSON.parse(readFileSync(path.join(base, "challenge.json"), "utf8"));
  console.log(`→ docker build ${image}`);
  execFileSync("docker", ["build", "-q", "-t", image, base], { stdio: "inherit" });
}
