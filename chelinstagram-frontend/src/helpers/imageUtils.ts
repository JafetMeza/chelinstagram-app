export const getAvatarSrc = (avatarUrl?: string | null): string => {
    const backendUrl = import.meta.env.VITE_API_URL;
    const defaultAvatar = '/default-avatar.png';

    if (!avatarUrl) return defaultAvatar;

    // If it's a Supabase/Cloud URL, return it as is
    if (avatarUrl.startsWith('http')) {
        return avatarUrl;
    }

    // If it's a legacy local path (like /uploads/...), concat with Backend URL
    return `${backendUrl}${avatarUrl}`;
};