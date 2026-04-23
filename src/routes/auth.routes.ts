import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
} from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, asyncHandler(updateProfile));

export default router;
