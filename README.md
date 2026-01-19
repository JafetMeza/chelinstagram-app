# 📸 Chelinstagram

**Chelinstagram** is a high-performance, mobile-first social networking platform built for private sharing and intimate connections. Designed as a tribute to privacy and speed, it allows users to share "Chelfies," engage in secure chats, and manage a personalized social grid.

**Mastermind & Lead Architect:** [Abraham Meza](https://github.com/JafetMeza)

---

## ⚡ Tech Stack

### Frontend (`chelinstagram-frontend`)

- **React 19 & Vite 7:** Utilizing the latest Concurrent Mode features and ultra-fast HMR.
- **Tailwind CSS 4:** Modern utility-first styling with the new `@tailwindcss/vite` plugin.
- **Redux Toolkit:** Advanced state management with DevTools integration.
- **RxJS & Lodash:** For complex data streams and utility-belt performance.
- **FontAwesome 7:** Comprehensive iconography for a premium feel.
- **React Router 7:** Handling nested layouts and dynamic viewport transitions.

### Backend (`chelinstagram-backend`)

- **Express 5:** Running on the latest major version for optimized middleware handling.
- **Prisma 7 & PostgreSQL:** Type-safe database management with a focus on relational integrity.
- **Multer:** Handling high-resolution "Chelfie" uploads.
- **JWT & Bcrypt:** Industrial-grade authentication and password hashing.
- **Swagger (OpenAPI 3.0):** Complete API documentation and automated type generation.

---

## 🗺️ Application Map

### Frontend Pages

- **`LoginPage`**: Secure entry point.
- **`HomePage`**: The main "Following" feed.
- **`CreateChelfiePage`**: Multi-part form for new post creation with image uploads.
- **`SearchPage`**: Global user discovery and exploration.
- **`ProfileGridPage`**: 3-column user grid featuring **Pinned Chelfies**.
- **`ProfileFeedPage`**: Vertical deep-dive into a user's content.
- **`FollowersPage`**: Management of followers and following relationships.
- **`ChatListPage`**: Private message inbox with real-time previews.
- **`ChatRoomPage`**: Immersive fixed-viewport messaging interface.
- **`SettingsPage`**: Profile customization and account management.

---

## 📡 API Reference & Controllers

The backend is fully documented via **Swagger UI** available at `/api-docs`.

### Core Endpoints

| Category   | Method  | Endpoint                  | Description                             |
| ---------- | ------- | ------------------------- | --------------------------------------- |
| **Auth**   | `POST`  | `/api/auth/login`         | Secure user authentication              |
| **Chat**   | `GET`   | `/api/chat/conversations` | Fetch user inbox                        |
| **Chat**   | `POST`  | `/api/chat/start`         | Start/Find a conversation               |
| **Posts**  | `GET`   | `/api/posts`              | Privacy-filtered "Following" feed       |
| **Posts**  | `PATCH` | `/api/posts/:postId`      | Update caption, location, or pin status |
| **Users**  | `POST`  | `/api/users/follow`       | Toggle follow relationship              |
| **Search** | `GET`   | `/api/users/search`       | Search users by username/display name   |

---

## 🛠️ Development & Type Safety

This project prioritizes a **Schema-First** approach. The frontend types are automatically generated from the backend Swagger specification to ensure zero-mismatch between data structures.

### Type Generation Command

To sync the frontend types with the backend schemas, run:

```bash
npx swagger-typescript-api generate -p http://localhost:3001/api-docs-json -o ./src/types/schema.d.ts -n file --no-client --generate-union-enums

```

### Backend Scripts

- `npm run dev`: Start development server with `tsx` watching.
- `npm run db:migrate`: Sync database schema and generate Prisma client.
- `npm run db:seed`: Populate the database with initial developer data.
- `npm run db:studio`: Visual interface for the PostgreSQL database.

---

## 🎨 Layout Philosophy

The project implements a **Fixed Viewport Architecture**. By utilizing a specialized `Layout` component and `h-dvh` (Dynamic Viewport Height) containers, we ensure that the navigation and headers remain stationary while individual pages handle their internal scrolling—creating a native-app experience on mobile browsers.

---
