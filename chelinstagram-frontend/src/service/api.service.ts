import { AuthResponse, CommentRequest, Conversation, LoginRequest, Message, Post, SearchUser, SendMessageRequest, UpdatePostRequest, UserProfile } from "@/types/schema";
import { ApiResponse, RequestType } from "./helpers/serviceConstants";
import { fetchMethod } from "./helpers/fetchMethod";
import { API_ROUTES } from "./helpers/urlConstants";

// --- AUTH ---
export const LoginApi = async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> =>
    await fetchMethod<AuthResponse>(API_ROUTES.AUTH.LOGIN, RequestType.POST, data);

// --- FEED / POSTS ---
export const GetFeedApi = async (): Promise<ApiResponse<Post[]>> =>
    await fetchMethod<Post[]>(API_ROUTES.POSTS.BASE, RequestType.GET);

export const CreatePostApi = async (data: FormData): Promise<ApiResponse<Post>> =>
    await fetchMethod<Post>(API_ROUTES.POSTS.BASE, RequestType.POST, data);

export const DeletePostApi = async (postId: string): Promise<ApiResponse<void>> =>
    await fetchMethod<void>(API_ROUTES.POSTS.BY_ID(postId), RequestType.DELETE);

export const GetUserPostsApi = async (username: string): Promise<ApiResponse<Post[]>> =>
    await fetchMethod<Post[]>(API_ROUTES.POSTS.BY_USER(username), RequestType.GET);

export const UpdatePostApi = async (postId: string, data: UpdatePostRequest): Promise<ApiResponse<Post>> =>
    await fetchMethod<Post>(API_ROUTES.POSTS.BY_ID(postId), RequestType.PATCH, data);

// --- INTERACTIONS ---
export const ToggleLikeApi = async (postId: string): Promise<ApiResponse<void>> =>
    await fetchMethod<void>(API_ROUTES.INTERACTIONS.LIKE, RequestType.POST, { postId });

export const AddCommentApi = async (data: CommentRequest): Promise<ApiResponse<Comment>> =>
    await fetchMethod<Comment>(API_ROUTES.INTERACTIONS.COMMENT, RequestType.POST, data);

export const GetCommentsApi = async (postId: string): Promise<ApiResponse<Comment[]>> =>
    await fetchMethod<Comment[]>(API_ROUTES.INTERACTIONS.GET_COMMENTS(postId), RequestType.GET);

// --- CHAT ---
export const GetConversationsApi = async (): Promise<ApiResponse<Conversation[]>> =>
    await fetchMethod<Conversation[]>(API_ROUTES.CHAT.CONVERSATIONS, RequestType.GET);

export const SendMessageApi = async (data: SendMessageRequest): Promise<ApiResponse<Message>> =>
    await fetchMethod<Message>(API_ROUTES.CHAT.MESSAGES, RequestType.POST, data);

export const GetMessagesApi = async (conversationId: string): Promise<ApiResponse<Message[]>> =>
    await fetchMethod<Message[]>(API_ROUTES.CHAT.CHAT_ROOM(conversationId), RequestType.GET);

export const StartConversationApi = async (recipientId: string): Promise<ApiResponse<Conversation>> =>
    await fetchMethod<Conversation>(API_ROUTES.CHAT.START, RequestType.POST, { recipientId });

export const DeleteConversationApi = async (conversationId: string): Promise<ApiResponse<void>> =>
    await fetchMethod<void>(API_ROUTES.CHAT.CHAT_ROOM(conversationId), RequestType.DELETE);

// --- USERS ---
export const GetMyProfileApi = async (): Promise<ApiResponse<UserProfile>> =>
    await fetchMethod<UserProfile>(API_ROUTES.USERS.PROFILE, RequestType.GET);

export const GetUserByUserNameApi = async (userId: string): Promise<ApiResponse<UserProfile>> =>
    await fetchMethod<UserProfile>(API_ROUTES.USERS.BY_USERNAME(userId), RequestType.GET);

export const SearchUsersApi = async (query: string): Promise<ApiResponse<SearchUser[]>> =>
    await fetchMethod<SearchUser[]>(`${API_ROUTES.USERS.SEARCH}?query=${query}`, RequestType.GET);

export const GetFollowersApi = async (username: string): Promise<ApiResponse<SearchUser[]>> =>
    await fetchMethod<SearchUser[]>(`${API_ROUTES.USERS.FOLLOWERS(username)}`, RequestType.GET);

export const GetFollowingApi = async (username: string): Promise<ApiResponse<SearchUser[]>> =>
    await fetchMethod<SearchUser[]>(`${API_ROUTES.USERS.FOLLOWING(username)}`, RequestType.GET);

export const UpdateProfileApi = async (data: FormData): Promise<ApiResponse<void>> =>
    await fetchMethod<void>(API_ROUTES.USERS.PROFILE, RequestType.PATCH, data);

export const ToggleFollowApi = async (followingId: string): Promise<ApiResponse<void>> =>
    await fetchMethod<void>(API_ROUTES.USERS.FOLLOW, RequestType.POST, { followingId });