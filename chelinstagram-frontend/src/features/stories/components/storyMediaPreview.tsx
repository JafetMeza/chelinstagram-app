import { useState } from 'react';
import { MediaCrop } from '../lib/types';

interface StoryMediaPreviewProps {
    src: string;
    mediaType: 'image' | 'video';
    // Video: el recorte cuadrado elegido en el VideoEditor. El backend recorta el video
    // con ffmpeg; aquí se reproduce el mismo encuadre con CSS para que el texto se coloque
    // sobre lo que realmente se publicará (antes se mostraba un object-cover centrado).
    crop?: MediaCrop | null;
}

// Llena un contenedor cuadrado (position: relative) con la media tal como se publicará
const StoryMediaPreview = ({ src, mediaType, crop }: StoryMediaPreviewProps) => {
    const [videoSize, setVideoSize] = useState<{ w: number; h: number; } | null>(null);

    if (mediaType === 'image') {
        return <img src={src} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="Story preview" />;
    }

    const cropStyle: React.CSSProperties | undefined = crop && crop.size > 0 && videoSize
        ? {
            width: `${(videoSize.w / crop.size) * 100}%`,
            height: `${(videoSize.h / crop.size) * 100}%`,
            left: `${(-crop.x / crop.size) * 100}%`,
            top: `${(-crop.y / crop.size) * 100}%`,
            maxWidth: 'none',
        }
        : undefined;

    return (
        <video
            src={src}
            onLoadedMetadata={(e) => setVideoSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
            className={`absolute pointer-events-none ${cropStyle ? '' : 'inset-0 w-full h-full object-cover'}`}
            style={cropStyle}
            muted
            playsInline
            autoPlay
            loop
        />
    );
};

export default StoryMediaPreview;
