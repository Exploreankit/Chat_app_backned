import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db";
import { setupSocket } from "./socket/socketHandler";
import { env } from "./config/env";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

setupSocket(io);

const start = async (): Promise<void> => {
  await connectDB();
  httpServer.listen(env.port, () => {
    console.log(`🚀 Syncly server running on http://localhost:${env.port}`);
  });
};

start().catch((err: Error) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});
