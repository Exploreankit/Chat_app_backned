import path from "path";
import dotenv from "dotenv";

// Walk up from cwd to find server/.env — works whether you run from
// the repo root or from inside the server/ folder
const candidates = [
  path.resolve(process.cwd(), "server/.env"), // running from repo root
  path.resolve(process.cwd(), ".env"),         // running from server/
];

for (const p of candidates) {
  const result = dotenv.config({ path: p });
  if (!result.error) break;
}

// Centralised env validation — fail fast if required vars are missing
const required = ["MONGO_URI", "JWT_SECRET", "REFRESH_TOKEN_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: parseInt(process.env.PORT ?? "5000", 10),
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
