import pino from "pino";
import type { AppEnv } from "@/config/env";

export function createLogger(env: AppEnv) {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: "ai102-backend" },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']"
      ],
      remove: true
    }
  });
}

