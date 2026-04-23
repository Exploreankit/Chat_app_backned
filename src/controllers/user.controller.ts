import { Response } from "express";
import User from "../models/User.model";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthRequest } from "../types";

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const q = req.query.q as string | undefined;
  if (!q || q.trim().length < 1) {
    sendSuccess(res, { users: [] });
    return;
  }

  const users = await User.find({
    _id: { $ne: req.user!._id },
    $or: [
      { username: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  })
    .select("-password")
    .limit(20);

  sendSuccess(res, { users });
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }
  sendSuccess(res, { user });
};
