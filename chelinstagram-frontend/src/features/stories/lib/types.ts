// Mantener en sync con chelinstragram-backend/src/config/storyText.ts
export type StoryFont = 'classic' | 'serif' | 'script' | 'hand' | 'typewriter' | 'display' | 'rounded';

export interface TextOverlay {
    id: string;
    text: string;
    x: number; // centro, en % del lienzo cuadrado
    y: number;
    color: string;
    fontSize: number; // in cqw (% of media width) — see MIN/MAX_FONT_SIZE
    align: 'left' | 'center' | 'right';
    font: StoryFont;
    bold: boolean;
    italic: boolean;
    underline: boolean;
}

export const STORY_FONTS: { id: StoryFont; label: string; family: string; }[] = [
    { id: 'classic', label: 'Clásica', family: '"Inter", system-ui, sans-serif' },
    { id: 'serif', label: 'Elegante', family: '"Playfair Display", Georgia, serif' },
    { id: 'script', label: 'Script', family: '"Pacifico", cursive' },
    { id: 'hand', label: 'A mano', family: '"Caveat", cursive' },
    { id: 'typewriter', label: 'Máquina', family: '"Courier Prime", "Courier New", monospace' },
    { id: 'display', label: 'Titular', family: '"Bebas Neue", Impact, sans-serif' },
    { id: 'rounded', label: 'Redonda', family: '"Nunito", system-ui, sans-serif' },
];

export const getFontFamily = (font: StoryFont | undefined) =>
    (STORY_FONTS.find((f) => f.id === font) ?? STORY_FONTS[0]).family;

export const TEXT_COLORS = ['#ffffff', '#000000', '#ff3040', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2'];

export const MAX_TEXT_OVERLAYS = 10;
export const MAX_TEXT_LENGTH = 300;
export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 20;
export const DEFAULT_FONT_SIZE = 8;

// Recorte cuadrado que el VideoEditor eligió, en píxeles del video original
export interface MediaCrop {
    x: number;
    y: number;
    size: number;
}
