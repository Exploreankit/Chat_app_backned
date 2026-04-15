import { Router, Response } from "express";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import { protect } from "../middleware/auth";
import type { AuthRequest } from "../types";

const router = Router();

// GET /api/messages/:conversationId
router.get("/:conversationId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user!._id,
    });
    if (!conversation) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "username avatar")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: req.user!._id },
        "readBy.user": { $ne: req.user!._id },
      },
      { $push: { readBy: { user: req.user!._id } } }
    );

    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/messages/:conversationId
router.post("/:conversationId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { content, type = "text", replyTo } = req.body as {
      content: string;
      type?: string;
      replyTo?: string;
    };

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user!._id,
    });
    if (!conversation) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    if (!content && type === "text") {
      res.status(400).json({ message: "Message content required" });
      return;
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user!._id,
      content,
      type,
      replyTo: replyTo ?? undefined,
    });

    await (message as InstanceType<typeof Message>).populate("sender", "username avatar");
    if (replyTo) await (message as InstanceType<typeof Message>).populate("replyTo");

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: (message as InstanceType<typeof Message>)._id,
      updatedAt: new Date(),
    });

    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// DELETE /api/messages/:messageId
router.delete("/:messageId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user!._id,
    });
    if (!message) {
      res.status(404).json({ message: "Message not found or not authorized" });
      return;
    }

    message.isDeleted = true;
    message.content = "This message was deleted";
    await message.save();

    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/messages/:messageId/react
router.post("/:messageId/react", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { emoji } = req.body as { emoji: string };
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    const userId = req.user!._id.toString();
    const existingIdx = message.reactions.findIndex(
      (r) => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions = message.reactions.filter(
        (r) => r.user.toString() !== userId
      );
      message.reactions.push({ user: req.user!._id, emoji });
    }

    await message.save();
    res.json({ message });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
