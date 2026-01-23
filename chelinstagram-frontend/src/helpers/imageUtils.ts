import imageCompression from 'browser-image-compression';

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

export const compressAndUpload = async (file: File) => {
    const options = {
        maxSizeMB: 1,          // Aim for under 1MB
        maxWidthOrHeight: 1080, // Standard Instagram-style resolution
        useWebWorker: true,
    };

    try {
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        // This does the magic
        const compressedFile = await imageCompression(file, options);

        console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

        // Now send compressedFile to your API instead of the original 'file'
        return compressedFile;
    } catch (error) {
        console.error("Compression failed:", error);
        return file; // Fallback to original if something goes wrong
    }
};