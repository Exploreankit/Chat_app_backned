import { Response } from "express";
import Conversation from "../models/Conversation.model";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthRequest } from "../types";

export const getConversations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const conversations = await Conversation.find({
    participants: req.user!._id,
  })
    .populate("participants", "-password")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username avatar" },
    })
    .sort({ updatedAt: -1 });

  sendSuccess(res, { conversations });
};

export const createOrGetConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { participantId } = req.body as { participantId: string };
  if (!participantId) {
    sendError(res, "participantId required", 400);
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

  sendSuccess(res, { conversation });
};

export const createGroupConversation = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { participantIds, groupName } = req.body as {
    participantIds: string[];
    groupName: string;
  };

  if (!participantIds || participantIds.length < 2) {
    sendError(res, "At least 2 participants required for a group", 400);
    return;
  }
  if (!groupName) {
    sendError(res, "Group name required", 400);
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
  sendSuccess(res, { conversation: populated }, 201);
};

export const getConversationById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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
    sendError(res, "Conversation not found", 404);
    return;
  }

  sendSuccess(res, { conversation });
};
