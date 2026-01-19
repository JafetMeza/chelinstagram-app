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
                        imageUrl: { type: 'string' }
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