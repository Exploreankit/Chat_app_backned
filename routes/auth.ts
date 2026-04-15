import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { protect } from "../middleware/auth";
import type { AuthRequest } from "../types";

const router = Router();

const generateToken = (id: string): string =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });

// POST /api/auth/register
router.post("/register", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(400).json({ message: "Username or email already taken" });
      return;
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id.toString());
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/auth/login
router.post("/login", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ message: "Email and password required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user._id.toString());
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
