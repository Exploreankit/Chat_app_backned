/**
 * Seed script — creates 3 test users + conversations + sample messages
 *
 * Run:  npx ts-node-dev --transpile-only server/src/seed.ts
 *   or: npx ts-node server/src/seed.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.model";
import Conversation from "./models/Conversation.model";
import Message from "./models/Message.model";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/syncly";

// ── Seed data ─────────────────────────────────────────────────────────────────

const USERS = [
  {
    username: "alice",
    email: "alice@syncly.dev",
    password: "password123",
    status: "Hey there! I am Alice 👋",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
  },
  {
    username: "bob",
    email: "bob@syncly.dev",
    password: "password123",
    status: "Bob here, always online 🚀",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
  },
  {
    username: "charlie",
    email: "charlie@syncly.dev",
    password: "password123",
    status: "Charlie checking in 🎯",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const createMessage = async (
  conversationId: mongoose.Types.ObjectId,
  senderId: mongoose.Types.ObjectId,
  content: string,
  minutesAgo: number
) => {
  const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
  return Message.create({ conversationId, sender: senderId, content, type: "text", createdAt });
};

// ── Main ──────────────────────────────────────────────────────────────────────

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Wipe existing seed users (by email) and their data
  const seedEmails = USERS.map((u) => u.email);
  const existingUsers = await User.find({ email: { $in: seedEmails } });
  const existingIds = existingUsers.map((u) => u._id);

  if (existingIds.length > 0) {
    const convs = await Conversation.find({ participants: { $in: existingIds } });
    const convIds = convs.map((c) => c._id);
    await Message.deleteMany({ conversationId: { $in: convIds } });
    await Conversation.deleteMany({ _id: { $in: convIds } });
    await User.deleteMany({ _id: { $in: existingIds } });
    console.log("🗑️  Cleared previous seed data");
  }

  // Create users (password hashing handled by the model pre-save hook)
  const createdUsers = await Promise.all(
    USERS.map((u) => User.create(u))
  );

  const [alice, bob, charlie] = createdUsers;
  console.log("👤 Created users: alice, bob, charlie  (password: password123)");

  // ── 1-on-1: Alice ↔ Bob ───────────────────────────────────────────────────
  const aliceBobConv = await Conversation.create({
    participants: [alice._id, bob._id],
    isGroup: false,
  });

  const aliceBobMessages = [
    { sender: alice._id, content: "Hey Bob! 👋 How's it going?", ago: 60 },
    { sender: bob._id,   content: "Alice! All good here. You?", ago: 58 },
    { sender: alice._id, content: "Pretty great, just testing Syncly 😄", ago: 55 },
    { sender: bob._id,   content: "Looks awesome so far!", ago: 53 },
    { sender: alice._id, content: "Right? Real-time messages are working 🎉", ago: 50 },
    { sender: bob._id,   content: "Can't wait to try the group chat too", ago: 48 },
  ];

  let lastMsg;
  for (const m of aliceBobMessages) {
    lastMsg = await createMessage(aliceBobConv._id, m.sender, m.content, m.ago);
  }
  await Conversation.findByIdAndUpdate(aliceBobConv._id, { lastMessage: lastMsg!._id });

  // ── 1-on-1: Alice ↔ Charlie ───────────────────────────────────────────────
  const aliceCharlieConv = await Conversation.create({
    participants: [alice._id, charlie._id],
    isGroup: false,
  });

  const aliceCharlieMessages = [
    { sender: charlie._id, content: "Alice, did you see the new feature?", ago: 30 },
    { sender: alice._id,   content: "Yes! The refresh token flow is smooth 🔐", ago: 28 },
    { sender: charlie._id, content: "Agreed. Session expiry modal is a nice touch", ago: 25 },
    { sender: alice._id,   content: "Thanks! Bob helped test it 😊", ago: 22 },
  ];

  for (const m of aliceCharlieMessages) {
    lastMsg = await createMessage(aliceCharlieConv._id, m.sender, m.content, m.ago);
  }
  await Conversation.findByIdAndUpdate(aliceCharlieConv._id, { lastMessage: lastMsg!._id });

  // ── Group: Alice + Bob + Charlie ──────────────────────────────────────────
  const groupConv = await Conversation.create({
    participants: [alice._id, bob._id, charlie._id],
    isGroup: true,
    groupName: "Syncly Testers 🧪",
    groupAdmin: alice._id,
  });

  const groupMessages = [
    { sender: alice._id,   content: "Welcome to the Syncly test group everyone! 🎊", ago: 20 },
    { sender: bob._id,     content: "Hey team! 👋", ago: 18 },
    { sender: charlie._id, content: "Let's break some things 😈", ago: 16 },
    { sender: alice._id,   content: "Please don't 😂", ago: 14 },
    { sender: bob._id,     content: "Haha, just kidding. This looks solid!", ago: 12 },
    { sender: charlie._id, content: "Agreed. Ship it! 🚀", ago: 10 },
    { sender: alice._id,   content: "Almost — still need to test file uploads", ago: 8 },
    { sender: bob._id,     content: "On it 💪", ago: 5 },
  ];

  for (const m of groupMessages) {
    lastMsg = await createMessage(groupConv._id, m.sender, m.content, m.ago);
  }
  await Conversation.findByIdAndUpdate(groupConv._id, { lastMessage: lastMsg!._id });

  console.log("💬 Created conversations: alice↔bob, alice↔charlie, group(all 3)");
  console.log("\n─────────────────────────────────────────");
  console.log("🔑  Test credentials (all share the same password)");
  console.log("─────────────────────────────────────────");
  console.log("  Email            Password");
  console.log("  alice@syncly.dev  password123");
  console.log("  bob@syncly.dev    password123");
  console.log("  charlie@syncly.dev password123");
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
  console.log("✅ Seed complete — disconnected from MongoDB");
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
