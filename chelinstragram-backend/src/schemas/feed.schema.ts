export const feedSchemas = {
    // The core Post object used in lists and single responses
    Post: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            imageUrl: { type: 'string' },
            caption: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
            isPinned: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            author: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    displayName: { type: 'string', nullable: true },
                    avatarUrl: { type: 'string' },
                }
            },
            isLikedByUser: { type: 'boolean' },
            // Reemplazamos _count por los contadores directos
            likesCount: {
                type: 'integer',
                description: 'Total number of likes (denormalized)',
                example: 0
            },
            commentCount: {
                type: 'integer',
                description: 'Total number of comments (denormalized)',
                example: 0
            }
        }
    },

    // Schema for the Multipart/Form-Data upload
    CreatePostRequest: {
        type: 'object',
        required: ['image'],
        properties: {
            caption: { type: 'string', example: 'A beautiful day in Wageningen! 🇳🇱' },
            location: { type: 'string', example: 'Wageningen, Netherlands' },
            isPinned: { type: 'boolean', default: false },
            image: { type: 'string', format: 'binary' }
        }
    },

    // Schema for updating (Patch)
    UpdatePostRequest: {
        type: 'object',
        properties: {
            caption: { type: 'string' },
            location: { type: 'string' },
            isPinned: { type: 'boolean' }
        }
    }
};