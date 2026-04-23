import { Router } from "express";
import {
  getMessages,
  createMessage,
  deleteMessage,
  reactToMessage,
} from "../controllers/message.controller";
import { protect } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/:conversationId", protect, asyncHandler(getMessages));
router.post("/:conversationId", protect, asyncHandler(createMessage));
router.delete("/:messageId", protect, asyncHandler(deleteMessage));
router.post("/:messageId/react", protect, asyncHandler(reactToMessage));

export default router;
