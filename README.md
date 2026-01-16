# Chelinstagram 📸

**Chelinstagram** is a lightweight, personalized social media platform designed as a digital scrapbook and media-sharing application. Built with a focus on high-performance media delivery and a custom-branded user experience.

## 🚀 Key Features

- **The "Chelfie" Feed:** A curated feed of photos and videos (Chelfies) from followed users.
- **Upload Chelfie?:** A custom media upload flow supporting high-quality images and video via Cloudinary.
- **Personalized Profiles:** Support for Display Names, Professional Bios, and profile customization.
- **Pinned Content:** Ability to pin important "Chelfies" to the top of a profile for onboarding or storytelling.
- **Social Interaction:** Real-time-ready architecture for likes and comments.
- **Coming Soon:** Integrated real-time chat functionality.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Media Storage:** Cloudinary (CDN-backed image/video delivery)
- **Authentication:** JWT-based secure authentication

## 🏗 System Architecture

The project follows a decoupled architecture where the Node.js API manages business logic and database interactions, serving a responsive React frontend.

### Core Logic: The "Pinned" Algorithm

The feed uses a priority-sorting algorithm to ensure that "Pinned" posts appear first, followed by a chronological sort of remaining content.

```sql
-- Conceptual logic for the feed query
ORDER BY isPinned DESC, createdAt DESC
```
