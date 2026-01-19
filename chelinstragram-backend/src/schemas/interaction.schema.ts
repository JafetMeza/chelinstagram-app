export const interactionSchemas = {
    // The core Comment object
    Comment: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            author: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    displayName: { type: 'string', nullable: true }
                }
            }
        }
    },

    // Request to Toggle a Like
    LikeRequest: {
        type: 'object',
        required: ['postId'],
        properties: {
            postId: { type: 'string' }
        }
    },

    // Request to Add a Comment
    CommentRequest: {
        type: 'object',
        required: ['postId', 'content'],
        properties: {
            postId: { type: 'string' },
            content: {
                type: 'string',
                example: "Que hermosa foto, Graciela! ❤️"
            }
        }
    }
};