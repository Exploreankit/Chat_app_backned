import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import type { IUser } from "../types";

interface JwtPayload {
  id: string;
}

interface AuthSocket extends Socket {
  user: IUser;
}

// userId → Set of socketIds (supports multiple tabs)
const onlineUsers = new Map<string, Set<string>>();

export const setupSocket = (io: Server): void => {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as { token?: string }).token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication error"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      (socket as AuthSocket).user = user;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (rawSocket) => {
    const socket = rawSocket as AuthSocket;
    const userId = socket.user._id.toString();
    console.log(`✅ Connected: ${socket.user.username} (${socket.id})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Join all conversation rooms
    const conversations = await Conversation.find({ participants: userId });
    conversations.forEach((conv) => socket.join(conv._id.toString()));

    socket.broadcast.emit("user:online", { userId });
    socket.emit("users:online", { userIds: [...onlineUsers.keys()] });

    // ── MESSAGING ────────────────────────────────────────────────────────────

    socket.on(
      "message:send",
      async (data: {
        conversationId: string;
        content: string;
        type?: string;
        replyTo?: string;
      }) => {
        try {
          const { conversationId, content, type = "text", replyTo } = data;

          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          });
          if (!conversation) return;

          const message = await Message.create({
            conversationId,
            sender: userId,
            content,
            type,
            replyTo: replyTo ?? undefined,
          });

          await message.populate("sender", "username avatar");
          if (replyTo) await message.populate("replyTo");

          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
          });

          io.to(conversationId).emit("message:new", { message });
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      }
    );

    socket.on("message:delete", async (data: { messageId: string }) => {
      try {
        const message = await Message.findOne({
          _id: data.messageId,
          sender: userId,
        });
        if (!message) return;

        message.isDeleted = true;
        message.content = "This message was deleted";
        await message.save();

        io.to(message.conversationId.toString()).emit("message:deleted", {
          messageId: data.messageId,
          conversationId: message.conversationId,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on(
      "message:react",
      async (data: { messageId: string; emoji: string }) => {
        try {
          const message = await Message.findById(data.messageId);
          if (!message) return;

          const existingIdx = message.reactions.findIndex(
            (r) => r.user.toString() === userId && r.emoji === data.emoji
          );

          if (existingIdx > -1) {
            message.reactions.splice(existingIdx, 1);
          } else {
            message.reactions = message.reactions.filter(
              (r) => r.user.toString() !== userId
            );
            message.reactions.push({ user: socket.user._id, emoji: data.emoji });
          }

          await message.save();
          await message.populate("reactions.user", "username");

          io.to(message.conversationId.toString()).emit("message:reacted", {
            messageId: data.messageId,
            reactions: message.reactions,
          });
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      }
    );

    // ── TYPING ───────────────────────────────────────────────────────────────

    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing:start", {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing:stop", { conversationId, userId });
    });

    // ── READ RECEIPTS ────────────────────────────────────────────────────────

    socket.on("messages:read", async ({ conversationId }: { conversationId: string }) => {
      try {
        await Message.updateMany(
          {
            conversationId,
            sender: { $ne: userId },
            "readBy.user": { $ne: userId },
          },
          { $push: { readBy: { user: userId } } }
        );
        socket.to(conversationId).emit("messages:read", { conversationId, userId });
      } catch (err) {
        console.error("Read receipt error:", err);
      }
    });

    // ── CONVERSATION ─────────────────────────────────────────────────────────

    socket.on("conversation:join", (conversationId: string) => {
      socket.join(conversationId);
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      console.log(`❌ Disconnected: ${socket.user.username} (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          socket.broadcast.emit("user:offline", { userId });
        }
      }
    });
  });
};
