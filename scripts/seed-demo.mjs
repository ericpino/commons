// Compatibility entry point: use Prisma's configured demo seeder.
import { spawnSync } from "node:child_process";
if (!process.argv.includes("--reset-demo"))
  throw new Error("Explicit --reset-demo is required");
const result = spawnSync(
  "npm",
  ["run", "db:seed", "-w", "apps/api", "--", "--", "--reset-demo"],
  { stdio: "inherit", env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
