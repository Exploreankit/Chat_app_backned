import { Router, Response } from "express";
import User from "../models/User";
import { protect } from "../middleware/auth";
import type { AuthRequest } from "../types";

const router = Router();

// GET /api/users/search?q=query
router.get("/search", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;
    if (!q || q.trim().length < 1) {
      res.json({ users: [] });
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

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/users/:id
router.get("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
