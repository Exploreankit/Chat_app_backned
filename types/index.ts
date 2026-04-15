import { Request } from "express";
import { Document, Types } from "mongoose";

// ── User ──────────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  avatar: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// ── Message ───────────────────────────────────────────────────────────────────

export interface IReaction {
  user: Types.ObjectId;
  emoji: string;
}

export interface IReadBy {
  user: Types.ObjectId;
  readAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  type: "text" | "image" | "file" | "system";
  fileUrl?: string;
  fileName?: string;
  readBy: IReadBy[];
  replyTo?: Types.ObjectId;
  isDeleted: boolean;
  reactions: IReaction[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Conversation ──────────────────────────────────────────────────────────────

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupAdmin?: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Auth request ──────────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: IUser;
}
