import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Ensure these match your .env names
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file - The file object from Express (Express.Multer.File)
 * @returns The public URL of the uploaded image
 */
export const uploadImageToSupabase = async (file: Express.Multer.File): Promise<string> => {
    // 1. Create a unique filename to avoid overwriting
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExtension}`;
    const filePath = `posts/${fileName}`; // Organized in a 'posts' folder

    // 2. Upload to your bucket (named 'photos')
    const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        console.error('Supabase Upload Error:', error.message);
        throw new Error('Failed to upload image to storage');
    }

    // 3. Get the Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

    return publicUrl;
};