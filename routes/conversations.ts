import { Router, Response } from "express";
import Conversation from "../models/Conversation";
import { protect } from "../middleware/auth";
import type { AuthRequest } from "../types";

const router = Router();

// GET /api/conversations
router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find({
      participants: req.user!._id,
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      })
      .sort({ updatedAt: -1 });

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/conversations — create or get 1-on-1
router.post("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantId } = req.body as { participantId: string };
    if (!participantId) {
      res.status(400).json({ message: "participantId required" });
      return;
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user!._id, participantId], $size: 2 },
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user!._id, participantId],
        isGroup: false,
      });
      conversation = await conversation.populate("participants", "-password");
    }

    res.json({ conversation });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/conversations/group
router.post("/group", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantIds, groupName } = req.body as {
      participantIds: string[];
      groupName: string;
    };

    if (!participantIds || participantIds.length < 2) {
      res.status(400).json({ message: "At least 2 participants required for a group" });
      return;
    }
    if (!groupName) {
      res.status(400).json({ message: "Group name required" });
      return;
    }

    const myId = req.user!._id.toString();
    const allParticipants = [myId, ...participantIds.filter((id) => id !== myId)];

    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: true,
      groupName,
      groupAdmin: req.user!._id,
    });

    const populated = await conversation.populate("participants", "-password");
    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/conversations/:id
router.get("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user!._id,
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.json({ conversation });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
