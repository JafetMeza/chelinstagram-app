import { useCallback, useRef } from 'react';
import { faCamera, faImages, faVideo, type IconDefinition } from '@fortawesome/free-solid-svg-icons';

// Origen del contenido: cámara (foto o video) o galería. Usa el mismo input de archivo.
export type MediaSource = 'photo' | 'video' | 'gallery';

export const MEDIA_SOURCE_OPTIONS: { value: MediaSource; label: string; icon: IconDefinition }[] = [
    { value: 'photo', label: 'Tomar foto', icon: faCamera },
    { value: 'video', label: 'Grabar video', icon: faVideo },
    { value: 'gallery', label: 'Subir desde la galería', icon: faImages },
];

const SOURCE_INPUT: Record<MediaSource, { accept: string; capture: boolean }> = {
    photo: { accept: 'image/*', capture: true },
    video: { accept: 'video/*', capture: true },
    gallery: { accept: 'image/*,video/*', capture: false },
};

/**
 * Devuelve `pick(source)` para abrir el selector del origen indicado, y `input`
 * (el <input type="file"> oculto que hay que renderizar en el componente).
 * `pick` debe llamarse desde un handler de click para que el navegador lo permita.
 */
export const useMediaPicker = (onFile: (file: File) => void) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const pick = useCallback((source: MediaSource) => {
        const input = inputRef.current;
        if (!input) return;
        const config = SOURCE_INPUT[source];
        input.accept = config.accept;
        if (config.capture) input.setAttribute('capture', 'environment');
        else input.removeAttribute('capture');
        input.click();
    }, []);

    const input = (
        <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onFile(file);
            }}
        />
    );

    return { pick, input };
};
