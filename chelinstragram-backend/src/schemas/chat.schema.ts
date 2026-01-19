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
            senderId: { type: 'string' }
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
            content: { type: 'string', example: 'Hey Graciela!' }
        }
    }
};