export const Url = "http://localhost:3001";
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
    },

    // Users
    USERS: {
        PROFILE: `${UrlHost}/users/profile`,
        SEARCH: `${UrlHost}/users/search`,
        BY_ID: (userId: string) => `${UrlHost}/users/${userId}`,
        FOLLOW: `${UrlHost}/users/follow`,
    }
};