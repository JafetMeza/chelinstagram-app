/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
}

export interface UserProfile {
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  _count?: {
    followers?: number;
    following?: number;
    posts?: number;
  };
  posts?: {
    id?: string;
    imageUrl?: string;
  }[];
}

export interface SearchUser {
  id?: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  /** @format binary */
  avatar?: File;
}

export interface LoginRequest {
  /** @example "abraham_meza" */
  username: string;
  /** @example "password123" */
  password: string;
}

export interface AuthResponse {
  token?: string;
  user?: User;
}

export interface Message {
  id?: string;
  content?: string;
  /** @format date-time */
  createdAt?: string;
  senderId?: string;
}

export interface Conversation {
  id?: string;
  /** @format date-time */
  updatedAt?: string;
  participants?: User[];
  messages?: Message[];
}

export interface SendMessageRequest {
  conversationId: string;
  /** @example "Hey Graciela!" */
  content: string;
}

export interface Post {
  id?: string;
  imageUrl?: string;
  caption?: string | null;
  location?: string | null;
  isPinned?: boolean;
  /** @format date-time */
  createdAt?: string;
  author?: {
    username?: string;
    displayName?: string | null;
  };
  _count?: {
    likes?: number;
    comments?: number;
  };
}

export interface CreatePostRequest {
  /** @example "A beautiful day in Wageningen! 🇳🇱" */
  caption?: string;
  /** @example "Wageningen, Netherlands" */
  location?: string;
  /** @default false */
  isPinned?: boolean;
  /** @format binary */
  image: File;
}

export interface UpdatePostRequest {
  caption?: string;
  location?: string;
  isPinned?: boolean;
}

export interface Comment {
  id?: string;
  content?: string;
  /** @format date-time */
  createdAt?: string;
  author?: {
    username?: string;
    displayName?: string | null;
  };
}

export interface LikeRequest {
  postId: string;
}

export interface CommentRequest {
  postId: string;
  /** @example "Que hermosa foto, Graciela! ❤️" */
  content: string;
}
