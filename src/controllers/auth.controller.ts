import { Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import { sendSuccess, sendError } from "../utils/response";
import { env } from "../config/env";
import type { AuthRequest } from "../types";

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email, password } = req.body as {
    username: string;
    email: string;
    password: string;
  };

  if (!username || !email || !password) {
    sendError(res, "All fields are required", 400);
    return;
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    sendError(res, "Username or email already taken", 400);
    return;
  }

  const user = await User.create({ username, email, password });
  const token = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  sendSuccess(res, { user, token, refreshToken }, 201);
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    sendError(res, "Email and password required", 400);
    return;
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const token = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  sendSuccess(res, { user, token, refreshToken });
};

export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    sendError(res, "Refresh token required", 401);
    return;
  }

  let payload: { id: string };
  try {
    payload = jwt.verify(refreshToken, env.refreshTokenSecret) as { id: string };
  } catch {
    sendError(res, "Invalid or expired refresh token", 401);
    return;
  }

  const user = await User.findById(payload.id).select("-password");
  if (!user) {
    sendError(res, "User not found", 401);
    return;
  }

  const newAccessToken = generateAccessToken(user._id.toString());
  const newRefreshToken = generateRefreshToken(user._id.toString());

  sendSuccess(res, { token: newAccessToken, refreshToken: newRefreshToken });
};

export const logout = (_req: AuthRequest, res: Response): void => {
  sendSuccess(res, { message: "Logged out" });
};

export const getMe = (req: AuthRequest, res: Response): void => {
  sendSuccess(res, { user: req.user });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, status, avatar } = req.body as {
    username?: string;
    status?: string;
    avatar?: string;
  };

  const updates: Record<string, string> = {};
  if (username) updates.username = username;
  if (status !== undefined) updates.status = status;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user!._id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, { user });
};
