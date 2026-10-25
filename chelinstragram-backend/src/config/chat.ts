// Reacciones permitidas en mensajes. Para agregar una nueva basta con sumarla aquí
// y en chelinstagram-frontend/src/features/chat/lib/reactions.ts (no requiere migración).
export const REACTIONS = ['heart', 'laugh', 'sad', 'angry', 'surprise'] as const;
export type ReactionType = typeof REACTIONS[number];

export const isReactionType = (value: unknown): value is ReactionType =>
    typeof value === 'string' && (REACTIONS as readonly string[]).includes(value);

export const MESSAGES_PAGE_SIZE = 30;
export const MAX_MESSAGES_PAGE_SIZE = 100;
