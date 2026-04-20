import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Función Híbrida: Decide si subir a Supabase o guardar localmente
 */
export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';

    if (useLocalStorage) {
        // --- LÓGICA LOCAL PARA DESARROLLO ---
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExtension}`;

        // Asegúrate de que la carpeta existe
        const uploadsPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
        }

        const filePath = path.join(uploadsPath, fileName);

        // Guardar el buffer físicamente en tu disco duro
        fs.writeFileSync(filePath, file.buffer);

        console.log(`[Local Storage] ✅ File saved: /uploads/${fileName}`);

        // Retornamos la ruta relativa para que el frontend la use
        return `/uploads/${fileName}`;
    } else {
        // --- TU LÓGICA ORIGINAL DE SUPABASE (SIN CAMBIOS) ---
        return uploadImageToSupabase(file);
    }
};

/**
 * Tu lógica original intacta
 */
export const uploadImageToSupabase = async (file: Express.Multer.File): Promise<string> => {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExtension}`;
    const filePath = `posts/${fileName}`;

    const { data, error } = await supabase.storage
        .from('chelinstagram-images')
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        console.error('Supabase Upload Error:', error.message);
        throw new Error('Failed to upload image to storage');
    }

    const { data: { publicUrl } } = supabase.storage
        .from('chelinstagram-images')
        .getPublicUrl(filePath);

    return publicUrl;
};