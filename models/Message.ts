import mongoose, { Schema } from "mongoose";
import type { IMessage } from "../types";

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, trim: true },
    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    fileUrl: { type: String },
    fileName: { type: String },
    readBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    isDeleted: { type: Boolean, default: false },
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("Message", messageSchema);
