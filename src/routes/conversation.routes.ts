import { Router } from "express";
import {
  getConversations,
  createOrGetConversation,
  createGroupConversation,
  getConversationById,
} from "../controllers/conversation.controller";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", protect, asyncHandler(getConversations));
router.post("/", protect, asyncHandler(createOrGetConversation));
router.post("/group", protect, asyncHandler(createGroupConversation));
router.get("/:id", protect, asyncHandler(getConversationById));

export default router;
