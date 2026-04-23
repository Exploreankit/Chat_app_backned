import { Response } from "express";
import Message from "../models/Message.model";
import Conversation from "../models/Conversation.model";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthRequest } from "../types";

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user!._id,
  });
  if (!conversation) {
    sendError(res, "Access denied", 403);
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

  sendSuccess(res, { messages: messages.reverse() });
};

export const createMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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
    sendError(res, "Access denied", 403);
    return;
  }

  if (!content && type === "text") {
    sendError(res, "Message content required", 400);
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

  sendSuccess(res, { message }, 201);
};

export const deleteMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const message = await Message.findOne({
    _id: req.params.messageId,
    sender: req.user!._id,
  });
  if (!message) {
    sendError(res, "Message not found or not authorized", 404);
    return;
  }

  message.isDeleted = true;
  message.content = "This message was deleted";
  await message.save();

  sendSuccess(res, { message });
};

export const reactToMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { emoji } = req.body as { emoji: string };
  const message = await Message.findById(req.params.messageId);
  if (!message) {
    sendError(res, "Message not found", 404);
    return;
  }

  const userId = req.user!._id.toString();
  const existingIdx = message.reactions.findIndex(
    (r) => r.user.toString() === userId && r.emoji === emoji
  );

  if (existingIdx > -1) {
    message.reactions.splice(existingIdx, 1);
  } else {
    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId);
    message.reactions.push({ user: req.user!._id, emoji });
  }

  await message.save();
  sendSuccess(res, { message });
};
