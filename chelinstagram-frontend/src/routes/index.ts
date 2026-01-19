export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    CHAT_LIST: '/chat-list',
    CHAT_PATH: '/chat/:conversationId',
    CHAT: (conversationId: string) => `/chat/${conversationId}`,
    EXPLORE: '/explore',
    CREATE: '/create',
    SETTINGS: '/settings',
    PROFILE_PATH: '/profile/:username',
    PROFILE_FEED_PATH: '/profile/:username/feed',
    FOLLOWERS_PATH: '/profile/:username/followers',
    // For navigating in your code (the generators):
    PROFILE: (username: string) => `/profile/${username}`,
    PROFILE_FEED: (username: string) => `/profile/${username}/feed`,
    FOLLOWERS: (username: string) => `/profile/${username}/followers`,
};