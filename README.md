# Chelinstagram 📸

**Chelinstagram** is a lightweight, personalized social media platform designed as a digital scrapbook and media-sharing application. Built with a focus on high-performance media delivery and a custom-branded user experience.

## 🚀 Key Features

- **The "Chelfie" Feed:** A curated feed of photos from followed users, filtered to keep your circle private.
- **Upload Chelfie:** A custom media upload flow supporting high-quality images with location tagging and "Wageningen" metadata.
- **Personalized Profiles:** Custom avatars, professional bios, and real-time follower/following statistics.
- **Pinned Content:** A priority system that keeps special memories at the top of the feed for storytelling.
- **Social Interaction:** Full support for likes, nested comments, and discovery via user search.
- **Direct Messaging:** A complete chat system with conversation threading and last-message previews.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS (Development Pending)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Media Storage:** Local Filesystem (Multer) / Configurable for Cloudinary
- **Authentication:** JWT-based secure authentication

## 🏗 System Architecture

The project follows a decoupled architecture where the Node.js API manages business logic and database interactions, serving a responsive React frontend.

### Core Logic: The "Pinned" Algorithm

The feed uses a priority-sorting algorithm to ensure that "Pinned" posts appear first, followed by a chronological sort of remaining content.

```sql
-- Conceptual logic for the feed query
ORDER BY isPinned DESC, createdAt DESC
```
