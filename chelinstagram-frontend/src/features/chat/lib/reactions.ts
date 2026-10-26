import { MessageReaction } from "@/types/schema";

// Debe coincidir con REACTIONS en chelinstragram-backend/src/config/chat.ts.
// Para agregar una reacción nueva basta con sumarla en ambos lados.
export const REACTIONS = [
    { type: 'heart', emoji: '❤️', label: 'Me encanta' },
    { type: 'laugh', emoji: '😂', label: 'Risa' },
    { type: 'sad', emoji: '😢', label: 'Tristeza' },
    { type: 'angry', emoji: '😡', label: 'Enojo' },
    { type: 'surprise', emoji: '😮', label: 'Sorpresa' },
] as const;

export type ReactionType = typeof REACTIONS[number]['type'];

export const getReactionEmoji = (type?: string) =>
    REACTIONS.find(r => r.type === type)?.emoji ?? '';

// Misma reacción = quitarla; otra = reemplazarla (igual que el backend)
export const toggleReaction = (reactions: MessageReaction[] = [], userId: string, type: ReactionType): MessageReaction[] => {
    const mine = reactions.find(r => r.userId === userId);
    const others = reactions.filter(r => r.userId !== userId);
    return mine?.type === type ? others : [...others, { userId, type }];
};

export const groupReactions = (reactions: MessageReaction[] = [], userId?: string) =>
    REACTIONS
        .map(r => {
            const matches = reactions.filter(x => x.type === r.type);
            return {
                ...r,
                count: matches.length,
                mine: matches.some(x => x.userId === userId),
            };
        })
        .filter(r => r.count > 0);
