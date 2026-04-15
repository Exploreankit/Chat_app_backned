import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import conversationRoutes from "./routes/conversations";
import messageRoutes from "./routes/messages";
import { setupSocket } from "./socket/socketHandler";

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "Syncly" }));

// Socket.IO
setupSocket(io);

// Start
const PORT = parseInt(process.env.PORT ?? "5000", 10);
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/syncly";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Syncly server running on http://localhost:${PORT}`);
    });
  })
  .catch((err: Error) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
