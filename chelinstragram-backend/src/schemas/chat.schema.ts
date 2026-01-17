export const chatSchemas = {
    Message: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            senderId: { type: 'string' }
        }
    },
    Conversation: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
            participants: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' }
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
            content: { type: 'string', example: 'Hey Graciela!' }
        }
    }
};