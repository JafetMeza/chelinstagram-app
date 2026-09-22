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
  avatarUrl?: string | null;
}

export interface UserProfile {
  id?: string;
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isFollowing?: boolean;
  _count?: {
    followers?: number;
    following?: number;
    posts?: number;
  };
  posts?: {
    id?: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO";
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
  avatarUrl?: File;
}

export interface LoginRequest {
  /** @example "abraham_meza" */
  username: string;
  /** @example "!Q2w3e4r5" */
  password: string;
}

export interface AuthResponse {
  /** @example "Login successful!" */
  message?: string;
  /** JWT short-lived access token */
  accessToken?: string;
  user?: {
    id?: string;
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

export interface Participant {
  id?: string;
  userId?: string;
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
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
  participants?: Participant[];
  messages?: Message[];
}

export interface SendMessageRequest {
  conversationId: string;
  /** @example "Hey Graciela!" */
  content: string;
}

export interface Post {
  id?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
  caption?: string | null;
  location?: string | null;
  isPinned?: boolean;
  /** @format date-time */
  createdAt?: string;
  author?: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string;
  };
  isLikedByUser?: boolean;
  /** @example 0 */
  likesCount?: number;
  /** @example 0 */
  commentCount?: number;
}

export interface CreatePostRequest {
  /** @example "A beautiful day in Wageningen! 🇳🇱" */
  caption?: string;
  /** @example "Wageningen, Netherlands" */
  location?: string;
  /** @default false */
  isPinned?: boolean;
  /** @format binary */
  media: File;
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

export interface Story {
  id?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO";
  /** @example 15 */
  duration?: number;
  /** @format date-time */
  expiresAt?: string;
  /** @format date-time */
  createdAt?: string;
  isViewedByUser?: boolean;
}

/** All active stories for one author, as shown in the story tray */
export interface StoryGroup {
  author?: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  hasUnseen?: boolean;
  stories?: Story[];
}

export interface CreateStoryRequest {
  /** @format binary */
  media: File;
  startTime?: number;
  endTime?: number;
  isMuted?: boolean;
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  /**
   * How long the story stays visible, in minutes (5 min to 3 days)
   * @min 5
   * @max 4320
   * @default 1440
   */
  lifetimeMinutes?: number;
}

export interface StoryViewer {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** @format date-time */
  viewedAt?: string;
}

export type AuthLoginCreateData = AuthResponse;

export type AuthRefreshCreateData = AuthResponse;

export type ChatConversationsDetailData = Message[];

export type ChatConversationsDeleteData = any;

export type ChatConversationsListData = Conversation[];

export type ChatMessagesCreateData = Message;

export interface ChatStartCreatePayload {
  /** @example "user-uuid-here" */
  recipientId?: string;
}

export type ChatStartCreateData = Conversation[];

export type PostsCreateData = Post;

export type PostsListData = Post[];

export type PostsPartialUpdateData = Post;

export type PostsDeleteData = any;

export type PostsUserDetailData =
  | Post[]
  | {
    data?: Post[];
    meta?: {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
      hasNextPage?: boolean;
    };
  };

export type InteractionsLikeCreateData = any;

export type InteractionsCommentCreateData = Comment;

export type InteractionsCommentsDetailData = Comment[];

export type StoriesCreateData = Story;

export type StoriesListData = StoryGroup[];

export type StoriesViewCreateData = any;

export type StoriesViewersListData = StoryViewer[];

export type StoriesDeleteData = any;

export type UsersProfileListData = UserProfile;

export type UsersProfilePartialUpdateData = any;

export type UsersSearchListData = SearchUser[];

export type UsersDetailData = UserProfile;

export interface UsersFollowCreatePayload {
  followingId: string;
}

export type UsersFollowCreateData = any;

export type UsersFollowersListData = SearchUser[];

export type UsersFollowingListData = SearchUser[];
