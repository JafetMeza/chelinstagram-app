export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    CHAT: '/chat',
    EXPLORE: '/explore',
    CREATE: '/create',
    PROFILE: (userId: string | number = ':userId') => `/profile/${userId}`,
    SETTINGS: '/settings',
};