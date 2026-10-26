// Textos de las historias: se guardan como datos (no "quemados" en la imagen) y el frontend
// los pinta con el mismo componente en el editor y en el visor. Mantener en sync con
// chelinstagram-frontend/src/features/stories/lib/types.ts
export const STORY_FONTS = ['classic', 'serif', 'script', 'hand', 'typewriter', 'display', 'rounded'] as const;
export type StoryFont = typeof STORY_FONTS[number];

export const MAX_TEXT_OVERLAYS = 10;
export const MAX_TEXT_LENGTH = 300;
export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 20;

export type StoryTextOverlay = {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    align: 'left' | 'center' | 'right';
    font: StoryFont;
    bold: boolean;
    italic: boolean;
    underline: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Valida y normaliza lo que manda el cliente (JSON string en multipart/form-data).
 * Descarta entradas inválidas en lugar de fallar toda la historia.
 */
export const parseTextOverlays = (raw: unknown): StoryTextOverlay[] => {
    if (typeof raw !== 'string' || !raw.trim()) return [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];

    const overlays: StoryTextOverlay[] = [];
    for (const item of parsed.slice(0, MAX_TEXT_OVERLAYS)) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;

        const text = typeof o.text === 'string' ? o.text.slice(0, MAX_TEXT_LENGTH) : '';
        if (!text.trim() || !isFiniteNumber(o.x) || !isFiniteNumber(o.y) || !isFiniteNumber(o.fontSize)) continue;

        overlays.push({
            id: typeof o.id === 'string' ? o.id.slice(0, 64) : `${overlays.length}`,
            text,
            x: clamp(o.x, 0, 100),
            y: clamp(o.y, 0, 100),
            color: typeof o.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : '#ffffff',
            fontSize: clamp(o.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
            align: o.align === 'left' || o.align === 'right' ? o.align : 'center',
            font: STORY_FONTS.includes(o.font as StoryFont) ? (o.font as StoryFont) : 'classic',
            bold: o.bold === true,
            italic: o.italic === true,
            underline: o.underline === true,
        });
    }
    return overlays;
};
