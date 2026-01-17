# 📸 Chelinstagram Backend

A private, secure social media API built for Abraham and Graciela. This backend powers a specialized experience for sharing moments between Mexico 🇲🇽 and the Netherlands 🇳🇱.

## 🚀 Features

### 🖼️ Feed & Posts

- **Location Tagging:** Add locations like "Wageningen" or "CDMX" to your posts.
- **Pinning System:** Keep your favorite "Chelfies" at the top of the feed.
- **Multipart Uploads:** Robust image handling using Multer with preserved file extensions.
- **Ownership Protection:** Only the author can edit or delete their posts.

### 💬 Private Messaging

- **Smart Conversations:** Automatically finds existing chat rooms or creates new ones.
- **Inbox Preview:** Fetch conversations with the last message and timestamp.
- **Activity Sorting:** Active chats automatically move to the top of the inbox.

### 👥 Social & Discovery

- **User Search:** Find users by username or display name with case-insensitive search.
- **Follow System:** Create a curated feed by following specific users.
- **Profiles:** Public profile views with follower/following counts and user-specific galleries.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Documentation:** Swagger (OpenAPI 3.0)
- **Authentication:** JWT (JSON Web Tokens)
- **File Handling:** Multer

---

## 📦 Installation & Setup

1. **Install Dependencies:**

```bash
npm install

```

2. **Environment Variables:**
   Create a `.env` file in the root:

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/chelinstagram"
JWT_SECRET="your_super_secret_key"

```

3. **Database Migration:**

```bash
npx prisma migrate dev --name init_chelinstagram

```

4. **Seed the Database:**

```bash
npx prisma db seed

```

5. **Start the Server:**

```bash
npm run dev

```

---

## 📖 API Documentation

Once the server is running, you can explore and test all endpoints (Likes, Comments, Chat, etc.) via the interactive Swagger UI:

🔗 **Docs:** `http://localhost:3001/api-docs`

### Key Endpoints

| Method  | Endpoint             | Description                              |
| ------- | -------------------- | ---------------------------------------- |
| `POST`  | `/api/auth/login`    | Get your JWT Token                       |
| `GET`   | `/api/posts`         | Get personalized feed (Followers + Pins) |
| `POST`  | `/api/chat/start`    | Initialize a chat with a user            |
| `PATCH` | `/api/users/profile` | Update bio and avatar                    |

---

## 📂 Project Structure

```text
chelinstagram-backend/
├── prisma/
│   ├── schema.prisma    # Database Models (User, Post, Follow, etc.)
│   └── seed.ts          # Initial data for Abraham & Graciela
├── src/
│   ├── controllers/     # Business logic (Feed, Chat, User)
│   ├── middleware/      # Auth & Error handling
│   └── index.ts         # Main Entry point & Route registration
├── uploads/             # Physical storage for images (Git ignored)
└── .gitignore           # Optimized for Node/Prisma

```

---

## 🇳🇱 Deployment Notes

- **Timezone:** Ensure server time is set to UTC for consistent chat timestamps between time zones.
- **Storage:** The `uploads/` folder must be persisted if using a containerized deployment.
