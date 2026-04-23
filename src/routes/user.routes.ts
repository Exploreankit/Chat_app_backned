import { Router } from "express";
import { searchUsers, getUserById } from "../controllers/user.controller";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/search", protect, asyncHandler(searchUsers));
router.get("/:id", protect, asyncHandler(getUserById));

export default router;
