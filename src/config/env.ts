import path from "path";
import dotenv from "dotenv";

// Explicitly load server/.env regardless of where the process is started from
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

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
