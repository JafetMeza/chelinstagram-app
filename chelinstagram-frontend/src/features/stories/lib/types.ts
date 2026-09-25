export interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number; // in cqw (% of media width) — see MIN/MAX_FONT_SIZE
    align: 'left' | 'center' | 'right';
}

export const TEXT_COLORS = ['#ffffff', '#000000', '#ff3040', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2'];

export const MIN_FONT_SIZE = 4;
export const MAX_FONT_SIZE = 20;
export const DEFAULT_FONT_SIZE = 8;