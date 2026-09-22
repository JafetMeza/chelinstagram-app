import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static'; // 🟢 NUEVA IMPORTACIÓN (Binario de FFmpeg)
import ffprobeInstaller from 'ffprobe-static';
import { randomUUID } from 'crypto';

// 🟢 LE DECIMOS A FLUENT-FFMPEG DÓNDE ESTÁ EL BINARIO PARA EVITAR EL ERROR 500
if (ffmpegInstaller) {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

// 🟢 NEW: without this, fluent-ffmpeg's ffprobe() call throws "Cannot find ffprobe"
if (ffprobeInstaller?.path) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Función Híbrida: Procesa y sube fotos y videos
 */
export interface VideoProcessingOptions {
    startTime?: number;
    endTime?: number;
    isMuted?: boolean;
    crop?: { x: number; y: number; size: number; };
}

export const uploadImage = async (
    file: Express.Multer.File,
    videoOptions?: VideoProcessingOptions
): Promise<string> => {
    const isVideo = file.mimetype.startsWith('video/');
    return isVideo ? processAndUploadVideo(file, videoOptions) : processAndUploadPhoto(file);
};

/**
 * Procesa Fotos (Tu lógica original intacta)
 */
const processAndUploadPhoto = async (file: Express.Multer.File): Promise<string> => {
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';

    if (useLocalStorage) {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExtension}`;
        const uploadsPath = path.join(__dirname, '../../uploads');

        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
        }

        const filePath = path.join(uploadsPath, fileName);
        fs.writeFileSync(filePath, file.buffer);
        console.log(`[Local Storage] ✅ Photo saved: /uploads/${fileName}`);
        return `/uploads/${fileName}`;
    } else {
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
            throw new Error('Failed to upload photo to storage');
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chelinstagram-images')
            .getPublicUrl(filePath);

        return publicUrl;
    }
};

// Extracts a square that may extend past the source frame on any side,
// by padding the source (with black) just enough to contain it, then cropping.
const buildCropOrPadFilters = (
    crop: { x: number; y: number; size: number; },
    sourceW: number,
    sourceH: number,
    outSize = 720
): string[] => {
    const { x, y, size } = crop;
    if (!size || size <= 0) return [`scale=${outSize}:${outSize}`];

    const padLeft = Math.max(0, -x);
    const padTop = Math.max(0, -y);
    const padRight = Math.max(0, (x + size) - sourceW);
    const padBottom = Math.max(0, (y + size) - sourceH);

    const filters: string[] = [];

    if (padLeft || padTop || padRight || padBottom) {
        const paddedW = sourceW + padLeft + padRight;
        const paddedH = sourceH + padTop + padBottom;
        // 🟢 FIX: all-named args — avoids mixing positional/named syntax in one filter
        filters.push(`pad=w=${paddedW}:h=${paddedH}:x=${padLeft}:y=${padTop}:color=black`);
        filters.push(`crop=w=${size}:h=${size}:x=${x + padLeft}:y=${y + padTop}`);
    } else {
        filters.push(`crop=w=${size}:h=${size}:x=${x}:y=${y}`);
    }

    filters.push(`scale=w=${outSize}:h=${outSize}`);
    return filters;
};

// 🟢 NEW: need the source's actual decoded dimensions to compute padding correctly
const getVideoDimensions = (inputPath: string): Promise<{ width: number; height: number; }> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
            if (err) return reject(err);
            const vs = data.streams.find(s => s.codec_type === 'video');
            if (!vs?.width || !vs?.height) return reject(new Error('Could not read video dimensions'));
            resolve({ width: vs.width, height: vs.height });
        });
    });
};

/**
 * Procesa Videos: Comprime con FFmpeg antes de guardar
 */
const processAndUploadVideo = async (
    file: Express.Multer.File,
    options?: VideoProcessingOptions
): Promise<string> => {
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';
    const uploadsPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

    const tempInputName = `temp-in-${randomUUID()}.${file.originalname.split('.').pop()}`;
    const tempInputPath = path.join(uploadsPath, tempInputName);
    fs.writeFileSync(tempInputPath, file.buffer);

    const outFileName = `vid-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp4`;
    const tempOutputPath = path.join(uploadsPath, outFileName);

    const { width: sourceW, height: sourceH } = await getVideoDimensions(tempInputPath);
    console.log(`[Video Compressor] 📐 Source dimensions: ${sourceW}x${sourceH}`);
    console.log(`[Video Compressor] 🎬 Starting compression for ${file.originalname}...`);

    await new Promise<void>((resolve, reject) => {
        let command = ffmpeg(tempInputPath);

        if (options?.startTime !== undefined && !Number.isNaN(options.startTime)) {
            command = command.setStartTime(options.startTime);
        }
        if (
            options?.startTime !== undefined && options?.endTime !== undefined &&
            !Number.isNaN(options.startTime) && !Number.isNaN(options.endTime) &&
            options.endTime > options.startTime
        ) {
            command = command.duration(options.endTime - options.startTime);
        }

        const filters = options?.crop && options.crop.size > 0
            ? buildCropOrPadFilters(options.crop, sourceW, sourceH)
            : [`scale=-2:720`];
        command = command.videoFilters(filters);

        command = command.videoBitrate('1500k').videoCodec('libx264').format('mp4');

        if (options?.isMuted) {
            command = command.noAudio();
        } else {
            command = command.audioCodec('aac').audioBitrate('128k');
        }

        command
            .on('start', (cmd) => console.log('[Video Compressor] ffmpeg cmd:', cmd))
            .on('end', () => { console.log(`[Video Compressor] ✅ Compression finished!`); resolve(); })
            .on('error', (err) => { console.error(`[Video Compressor] ❌ Error:`, err); reject(err); })
            .save(tempOutputPath);
    });

    fs.unlinkSync(tempInputPath);

    if (useLocalStorage) {
        console.log(`[Local Storage] ✅ Video saved: /uploads/${outFileName}`);
        return `/uploads/${outFileName}`;
    }

    const compressedBuffer = fs.readFileSync(tempOutputPath);
    const filePath = `posts/${outFileName}`;

    const { data, error } = await supabase.storage
        .from('chelinstagram-images')
        .upload(filePath, compressedBuffer, { contentType: 'video/mp4', upsert: false });

    fs.unlinkSync(tempOutputPath);

    if (error) {
        console.error('Supabase Video Upload Error:', error.message);
        throw new Error('Failed to upload compressed video to storage');
    }

    const { data: { publicUrl } } = supabase.storage
        .from('chelinstagram-images')
        .getPublicUrl(filePath);

    return publicUrl;
};