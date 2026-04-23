# Syncly — Server

The backend for Syncly. Built with **Node.js + Express + TypeScript**, real-time via **Socket.IO**, and persisted in **MongoDB**.

---

## Tech Stack

| Layer    | Tech                        |
|----------|-----------------------------|
| Runtime  | Node.js 18+                 |
| Framework| Express 5                   |
| Language | TypeScript                  |
| Database | MongoDB + Mongoose          |
| Realtime | Socket.IO                   |
| Auth     | JWT (access + refresh token)|
| Hashing  | bcryptjs                    |

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts              # MongoDB connection
│   │   └── env.ts             # Env validation & typed config
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── conversation.controller.ts
│   │   ├── message.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT protect()
│   │   └── error.middleware.ts # Global error handler
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Conversation.model.ts
│   │   └── Message.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── conversation.routes.ts
│   │   ├── message.routes.ts
│   │   └── user.routes.ts
│   ├── socket/
│   │   └── socketHandler.ts   # All Socket.IO events
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces
│   ├── utils/
│   │   ├── asyncHandler.ts    # Wraps async routes → error middleware
│   │   ├── generateToken.ts   # Access (1d) + refresh (7d) token helpers
│   │   └── response.ts        # sendSuccess / sendError helpers
│   ├── app.ts                 # Express app + routes
│   ├── server.ts              # HTTP server + Socket.IO bootstrap
│   ├── index.ts               # Entry point
│   └── seed.ts                # Seed script (test users + conversations)
├── .env                       # Local secrets (gitignored)
├── .env.example               # Template — copy to .env
└── .gitignore
```

---

## Getting Started

### 1. Install dependencies

```bash
# from repo root
npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Fill in `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=<App>
JWT_SECRET=your_jwt_secret_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Start the dev server

```bash
# from repo root
npm run dev
```

Server starts at `http://localhost:5000`

### 4. Seed test data (optional)

Creates 3 users (alice, bob, charlie) + sample conversations:

```bash
npm run seed
```

| Email               | Password    |
|---------------------|-------------|
| alice@syncly.dev    | password123 |
| bob@syncly.dev      | password123 |
| charlie@syncly.dev  | password123 |

---

## Scripts

| Script            | Description                        |
|-------------------|------------------------------------|
| `npm run dev`     | Start with ts-node-dev (hot reload)|
| `npm run build`   | Compile TypeScript → `dist/`       |
| `npm run start`   | Run compiled `dist/index.js`       |
| `npm run typecheck` | Type-check without emitting     |
| `npm run seed`    | Seed test users + conversations    |

---

## REST API

### Auth

| Method | Path                  | Auth | Description                        |
|--------|-----------------------|------|------------------------------------|
| POST   | /api/auth/register    | —    | Register new user                  |
| POST   | /api/auth/login       | —    | Login, returns access + refresh token |
| POST   | /api/auth/refresh     | —    | Rotate tokens using refresh token  |
| POST   | /api/auth/logout      | —    | Logout (stateless, client clears tokens) |
| GET    | /api/auth/me          | ✓    | Get current user                   |
| PUT    | /api/auth/profile     | ✓    | Update username / status / avatar  |

### Users

| Method | Path                  | Auth | Description          |
|--------|-----------------------|------|----------------------|
| GET    | /api/users/search?q=  | ✓    | Search users by name/email |
| GET    | /api/users/:id        | ✓    | Get user by ID       |

### Conversations

| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | /api/conversations          | ✓    | Get all conversations    |
| POST   | /api/conversations          | ✓    | Create or get 1-on-1 DM  |
| POST   | /api/conversations/group    | ✓    | Create group chat        |
| GET    | /api/conversations/:id      | ✓    | Get single conversation  |

### Messages

| Method | Path                              | Auth | Description           |
|--------|-----------------------------------|------|-----------------------|
| GET    | /api/messages/:conversationId     | ✓    | Get messages (paginated) |
| POST   | /api/messages/:conversationId     | ✓    | Send message (REST)   |
| DELETE | /api/messages/:messageId          | ✓    | Soft-delete message   |
| POST   | /api/messages/:messageId/react    | ✓    | Toggle emoji reaction |

### Health

| Method | Path         | Description     |
|--------|--------------|-----------------|
| GET    | /api/health  | Server status   |

---

## Socket.IO Events

All socket connections require a valid JWT passed in `socket.handshake.auth.token`.

### Client → Server

| Event               | Payload                                              | Description              |
|---------------------|------------------------------------------------------|--------------------------|
| `message:send`      | `{ conversationId, content, type?, replyTo? }`       | Send a message           |
| `message:delete`    | `{ messageId }`                                      | Delete own message       |
| `message:react`     | `{ messageId, emoji }`                               | Toggle emoji reaction    |
| `typing:start`      | `{ conversationId }`                                 | Started typing           |
| `typing:stop`       | `{ conversationId }`                                 | Stopped typing           |
| `messages:read`     | `{ conversationId }`                                 | Mark messages as read    |
| `conversation:join` | `conversationId`                                     | Join a room              |
| `conversation:created` | `{ conversationId }`                              | Notify participants      |

### Server → Client

| Event                  | Payload                                           | Description                  |
|------------------------|---------------------------------------------------|------------------------------|
| `message:new`          | `{ message }`                                     | New message received         |
| `message:deleted`      | `{ messageId, conversationId }`                   | Message was deleted          |
| `message:reacted`      | `{ messageId, reactions }`                        | Reactions updated            |
| `typing:start`         | `{ conversationId, userId, username }`            | Someone is typing            |
| `typing:stop`          | `{ conversationId, userId }`                      | Someone stopped typing       |
| `messages:read`        | `{ conversationId, userId }`                      | Messages marked as read      |
| `user:online`          | `{ userId }`                                      | User came online             |
| `user:offline`         | `{ userId }`                                      | User went offline            |
| `users:online`         | `{ userIds }`                                     | Initial online users list    |
| `conversation:new`     | `{ conversation }`                                | New conversation created     |
| `conversation:updated` | `{ conversation }`                                | Conversation metadata updated|

---

## Auth Flow

```
Login → access token (1d) + refresh token (7d)
         ↓
    Access token expires
         ↓
    Client calls POST /api/auth/refresh
         ↓
    New access token + rotated refresh token
         ↓
    Refresh token expires → session expired modal
```
