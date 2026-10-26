export const userSchemas = {
    User: {
        type: 'object',
        required: ['id', 'username', 'email'],
        properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
        }
    },
    // Detailed Profile (for the Profile Page)
    UserProfile: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            isFollowing: { type: 'boolean' },
            readReceiptsEnabled: { type: 'boolean', description: 'Only returned for the current user profile' },
            notifyOnlineEnabled: { type: 'boolean', description: 'Only returned for the current user profile' },
            _count: {
                type: 'object',
                properties: {
                    followers: { type: 'integer' },
                    following: { type: 'integer' },
                    posts: { type: 'integer' }
                }
            },
            posts: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        mediaUrl: { type: 'string' }, // 👈 CAMBIADO
                        mediaType: { type: 'string', enum: ['IMAGE', 'VIDEO'] } // 👈 NUEVO
                    }
                }
            }
        }
    },

    // Search Result Object
    SearchUser: {
        type: 'object',
        properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true }
        }
    },

    UserSettings: {
        type: 'object',
        properties: {
            readReceiptsEnabled: { type: 'boolean', description: 'Read receipts ("Visto"), disabled by default' },
            notifyOnlineEnabled: { type: 'boolean', description: 'Push when someone you chat with comes online, enabled by default' }
        }
    },

    // Multipart Form Data for Updates
    UpdateProfileRequest: {
        type: 'object',
        properties: {
            displayName: { type: 'string' },
            bio: { type: 'string' },
            avatarUrl: { type: 'string', format: 'binary' }
        }
    }
};