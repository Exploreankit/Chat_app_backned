import jwt from "jsonwebtoken";
import { env } from "../config/env";

/** Short-lived access token — 1 day */
export const generateAccessToken = (id: string): string =>
  jwt.sign({ id }, env.jwtSecret, { expiresIn: "1d" });

/** Long-lived refresh token — 7 days */
export const generateRefreshToken = (id: string): string =>
  jwt.sign({ id }, env.refreshTokenSecret, { expiresIn: "7d" });
