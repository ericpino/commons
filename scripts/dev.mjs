import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { Pool } from "pg";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
if (existsSync(".env")) process.loadEnvFile(".env");
if (existsSync(".env.development")) process.loadEnvFile(".env.development");
const apiPort = process.env.API_PORT || "4000",
  webPort = process.env.WEB_PORT || "3000";
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://commons:local_demo_only@localhost:5432/commons",
  DEMO_PASSWORD: process.env.DEMO_PASSWORD || "local-demo-change-me",
  API_PORT: apiPort,
  WEB_ORIGIN: process.env.WEB_ORIGIN || `http://localhost:${webPort}`,
  API_URL: process.env.API_URL || `http://localhost:${apiPort}`,
  NEXT_TELEMETRY_DISABLED: "1",
};
const database = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
});
try {
  await database.query("SELECT 1");
} catch {
  console.error(
    "PostgreSQL is unavailable. Start it with `docker compose up -d db`, and set DATABASE_URL in .env if using a different port.",
  );
  await database.end();
  process.exit(1);
}
await database.end();
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      if (process.platform === "win32") child.kill("SIGTERM");
      else process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
for (const args of [
  ["run", "dev:api"],
  ["run", "dev", "--workspace", "apps/web", "--", "--port", webPort],
]) {
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd: root,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  children.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
}
console.log(
  `Commons development: http://localhost:${webPort} (API :${apiPort}). Press Ctrl+C to stop both apps.`,
);
