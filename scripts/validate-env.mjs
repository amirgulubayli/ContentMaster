import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  console.error(".env file not found. Copy .env.example to .env first.");
  process.exit(1);
}

const requiredKeys = [
  "NODE_ENV",
  "APP_URL",
  "API_URL",
  "DATABASE_URL",
  "REDIS_URL",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "SESSION_ENCRYPTION_KEY",
  "INTERNAL_MACHINE_TOKEN",
  "ADMIN_PASSWORD"
];

const raw = readFileSync(envPath, "utf8");
const values = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const missing = requiredKeys.filter((key) => !values[key]);

if (missing.length > 0) {
  console.error(`Missing required env keys: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Environment validation passed.");
