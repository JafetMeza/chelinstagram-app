export const Url = import.meta.env.VITE_API_URL;
export const UrlHost = `${Url}/api`;

export const API_ROUTES = {
    // Auth
    AUTH: {
        LOGIN: `${UrlHost}/auth/login`,
    },

    // Feed / Posts
    POSTS: {
        BASE: `${UrlHost}/posts`,
        BY_ID: (postId: string) => `${UrlHost}/posts/${postId}`,
        BY_USER: (username: string) => `${UrlHost}/posts/user/${username}`,
    },

    // Interactions
    INTERACTIONS: {
        LIKE: `${UrlHost}/interactions/like`,
        COMMENT: `${UrlHost}/interactions/comment`,
        GET_COMMENTS: (postId: string) => `${UrlHost}/interactions/comments/${postId}`,
    },

    // Chat
    CHAT: {
        CONVERSATIONS: `${UrlHost}/chat/conversations`,
        MESSAGES: `${UrlHost}/chat/messages`,
        START: `${UrlHost}/chat/start`,
        CHAT_ROOM: (conversationId: string) => `${API_ROUTES.CHAT.CONVERSATIONS}/${conversationId}`,
    },

    // Users
    USERS: {
        PROFILE: `${UrlHost}/users/profile`,
        SEARCH: `${UrlHost}/users/search`,
        BY_USERNAME: (userId: string) => `${UrlHost}/users/${userId}`,
        FOLLOWERS: (username: string) => `${UrlHost}/users/${username}/followers`,
        FOLLOWING: (username: string) => `${UrlHost}/users/${username}/following`,
        FOLLOW: `${UrlHost}/users/follow`,
    }
};