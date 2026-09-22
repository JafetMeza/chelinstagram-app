export const storySchemas = {
    Story: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            mediaUrl: { type: 'string' },
            mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
            duration: { type: 'integer', example: 15 },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            isViewedByUser: { type: 'boolean' }
        }
    },

    StoryGroup: {
        type: 'object',
        description: 'All active stories for one author, as shown in the story tray',
        properties: {
            author: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    displayName: { type: 'string', nullable: true },
                    avatarUrl: { type: 'string', nullable: true },
                }
            },
            hasUnseen: { type: 'boolean' },
            stories: {
                type: 'array',
                items: { $ref: '#/components/schemas/Story' }
            }
        }
    },

    CreateStoryRequest: {
        type: 'object',
        required: ['media'],
        properties: {
            media: { type: 'string', format: 'binary' },
            startTime: { type: 'number', example: 0, description: 'Video only: trim start (seconds)' },
            endTime: { type: 'number', example: 10, description: 'Video only: trim end (seconds)' },
            isMuted: { type: 'boolean', default: false },
            cropX: { type: 'integer', description: 'Video only: crop origin X in source pixels' },
            cropY: { type: 'integer', description: 'Video only: crop origin Y in source pixels' },
            cropSize: { type: 'integer', description: 'Video only: crop square size in source pixels' },
            // 🟢 NEW
            lifetimeMinutes: {
                type: 'integer',
                minimum: 5,
                maximum: 4320,
                default: 1440,
                description: 'How long the story stays visible, in minutes (5 min to 3 days)'
            },
        }
    },

    StoryViewer: {
        type: 'object',
        properties: {
            username: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            viewedAt: { type: 'string', format: 'date-time' }
        }
    }
};