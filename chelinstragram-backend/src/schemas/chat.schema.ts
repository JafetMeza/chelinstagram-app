export const chatSchemas = {
    Participant: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            // This is the actual User data
            user: { $ref: '#/components/schemas/User' }
        }
    },
    Message: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            senderId: { type: 'string' },
            conversationId: { type: 'string' },
            sender: { $ref: '#/components/schemas/User' },
            editedAt: { type: 'string', format: 'date-time', nullable: true },
            deletedAt: { type: 'string', format: 'date-time', nullable: true, description: 'If set, content is empty' },
            isRead: { type: 'boolean', description: 'Only present when both participants enabled read receipts' },
            replyToId: { type: 'string', nullable: true, description: 'ID del mensaje al que responde (misma conversación)' },
            replyTo: {
                type: 'object',
                nullable: true,
                description: 'Mensaje citado. content vacío si fue eliminado',
                properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    deletedAt: { type: 'string', format: 'date-time', nullable: true },
                    senderId: { type: 'string' },
                    sender: { $ref: '#/components/schemas/User' }
                }
            },
            reactions: {
                type: 'array',
                items: { $ref: '#/components/schemas/MessageReaction' }
            }
        }
    },
    MessageReaction: {
        type: 'object',
        properties: {
            userId: { type: 'string' },
            type: { type: 'string', enum: ['heart', 'laugh', 'sad', 'angry', 'surprise'] }
        }
    },
    MessagesPage: {
        type: 'object',
        properties: {
            data: {
                type: 'array',
                items: { $ref: '#/components/schemas/Message' }
            },
            meta: {
                type: 'object',
                properties: {
                    cursor: { type: 'string', nullable: true, description: 'Cursor sent in the request' },
                    nextCursor: { type: 'string', nullable: true, description: 'Cursor to load older messages' },
                    hasMore: { type: 'boolean' },
                    readReceipts: { type: 'boolean', description: 'True when both participants enabled read receipts' }
                }
            }
        }
    },
    Conversation: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            participants: {
                type: 'array',
                // FIXED: Now points to the Participant join table schema
                items: { $ref: '#/components/schemas/Participant' }
            },
            messages: {
                type: 'array',
                items: { $ref: '#/components/schemas/Message' }
            }
        }
    },
    SendMessageRequest: {
        type: 'object',
        required: ['conversationId', 'content'],
        properties: {
            conversationId: { type: 'string' },
            content: { type: 'string', example: 'Hey Graciela!' },
            replyToId: { type: 'string', nullable: true, description: 'Mensaje de la misma conversación al que se responde' }
        }
    }
};