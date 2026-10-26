export const storySchemas = {
    StoryTextOverlay: {
        type: 'object',
        description: 'Texto del editor de historias; x/y en % del lienzo cuadrado, fontSize en % del ancho (cqw)',
        required: ['id', 'text', 'x', 'y', 'color', 'fontSize', 'align', 'font', 'bold', 'italic', 'underline'],
        properties: {
            id: { type: 'string' },
            text: { type: 'string', maxLength: 300 },
            x: { type: 'number', minimum: 0, maximum: 100 },
            y: { type: 'number', minimum: 0, maximum: 100 },
            color: { type: 'string', example: '#ffffff' },
            fontSize: { type: 'number', minimum: 4, maximum: 20 },
            align: { type: 'string', enum: ['left', 'center', 'right'] },
            font: { type: 'string', enum: ['classic', 'serif', 'script', 'hand', 'typewriter', 'display', 'rounded'] },
            bold: { type: 'boolean' },
            italic: { type: 'boolean' },
            underline: { type: 'boolean' }
        }
    },

    Story: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            mediaUrl: { type: 'string' },
            mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
            duration: { type: 'integer', example: 15 },
            textOverlays: { type: 'array', items: { $ref: '#/components/schemas/StoryTextOverlay' } },
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
            textOverlays: { type: 'string', description: 'JSON array de StoryTextOverlay (máx. 10)' },
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