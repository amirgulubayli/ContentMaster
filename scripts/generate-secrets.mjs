import { randomBytes } from "node:crypto";

function makeSecret(bytes) {
  return randomBytes(bytes).toString("hex");
}

const secrets = {
  SESSION_ENCRYPTION_KEY: makeSecret(32),
  INTERNAL_MACHINE_TOKEN: makeSecret(24),
  ADMIN_PASSWORD: makeSecret(18),
  MINIO_SECRET_KEY: makeSecret(18)
};

for (const [key, value] of Object.entries(secrets)) {
  console.log(`${key}=${value}`);
}
